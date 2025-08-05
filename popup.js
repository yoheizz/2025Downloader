const filterInput = document.getElementById('filter');
const linkList = document.getElementById('link-list');
const countDisplay = document.getElementById('count');
const downloadAllBtn = document.getElementById('download-all');
const multiTabCheckbox = document.getElementById('multi-tab-mode');

let allLinks = [];
const downloadQueue = [];
let activeDownloads = 0;
const MAX_CONCURRENT = 1;

// 初期化
const init = () => {
  const useMultiTab = multiTabCheckbox.checked;
  getLinks(useMultiTab);
};

const getLinks = (multiTab = false) => {
  if (multiTab) {
    // 全タブ対象
    chrome.tabs.query({}, (tabs) => {
      const allPromises = tabs.map((tab) =>
        new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { type: 'getLinks' }, (response) => {
            if (chrome.runtime.lastError || !response) {
              resolve([]); // 無視
            } else {
              resolve(response);
            }
          });
        })
      );

      Promise.all(allPromises).then((results) => {
        allLinks = results.flat();
        applyFilter();
      });
    });
  } else {
    // アクティブタブのみ
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: 'getLinks' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          linkList.innerHTML = '<li>このページでは取得できません</li>';
          countDisplay.textContent = '';
          return;
        }
        allLinks = response;
        applyFilter();
      });
    });
  }
};

const applyFilter = () => {
  const keyword = filterInput.value.trim().toLowerCase();
  if (!keyword) {
    showLinks(allLinks);
    return;
  }
  const filtered = allLinks.filter(link => link.toLowerCase().includes(keyword));
  showLinks(filtered);
};

const showLinks = (links) => {
  linkList.innerHTML = '';
  countDisplay.textContent = `件数: ${links.length}`;

  links.forEach((link) => {
    const li = document.createElement('li');
    li.dataset.url = link;

    const btn = document.createElement('button');
    btn.textContent = 'download';
    btn.style.marginRight = '6px';
    btn.title = 'このリンクをダウンロード';
    btn.addEventListener('click', () => {
      if (chrome.downloads) {
        chrome.downloads.download({ url: link });
      } else {
        alert('downloads パーミッションが不足しています。');
      }
    });

    const a = document.createElement('a');
    a.href = link;
    const fileName = link.split('/').pop().split('?')[0].split('#')[0];
    a.textContent = fileName || link;
    a.target = '_blank';

    li.appendChild(btn);
    li.appendChild(a);
    linkList.appendChild(li);
  });
};

filterInput.addEventListener('input', applyFilter);
multiTabCheckbox.addEventListener('change', init);

const startNextDownload = () => {
  while (activeDownloads < MAX_CONCURRENT && downloadQueue.length > 0) {
    const url = downloadQueue.shift();
    activeDownloads++;

    chrome.downloads.download({ url }, () => {
      activeDownloads--;
      setTimeout(() => {
        startNextDownload();
      }, 1000);
    });
  }
};

downloadAllBtn.addEventListener('click', () => {
  activeDownloads = 0;
  downloadQueue.length = 0;

  const keyword = filterInput.value.trim().toLowerCase();
  const filtered = !keyword
    ? allLinks
    : allLinks.filter(link => link.toLowerCase().includes(keyword));

  if (filtered.length === 0) {
    alert('ダウンロード可能なリンクがありません。');
    return;
  }

  downloadQueue.push(...filtered);
  startNextDownload();
});

// 起動時に初期化
init();
