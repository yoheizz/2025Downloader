(() => {
  const links = Array.from(document.querySelectorAll('a'))
    .map(a => a.href)
    .filter(href => href && href.startsWith('http'));
    
  window._extractedLinks = links;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'getLinks') {
      sendResponse(links);
    }
  });
})();
