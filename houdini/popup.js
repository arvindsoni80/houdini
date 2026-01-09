document.getElementById('hideBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('github.com')) {
    showStatus('Please open a GitHub PR page', 'error');
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: hideCodeRabbitComments
  }, (results) => {
    if (chrome.runtime.lastError) {
      showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
    } else if (results && results[0]) {
      showStatus(results[0].result, 'success');
    }
  });
});

document.getElementById('showBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('github.com')) {
    showStatus('Please open a GitHub PR page', 'error');
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: showCodeRabbitComments
  }, (results) => {
    if (chrome.runtime.lastError) {
      showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
    } else if (results && results[0]) {
      showStatus(results[0].result, 'success');
    }
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
}

function hideCodeRabbitComments() {
  // Find all comment containers
  const comments = document.querySelectorAll('.timeline-comment, .review-comment');
  let hiddenCount = 0;

  comments.forEach(comment => {
    // Look for the author link within the comment
    const authorLink = comment.querySelector('a.author, a[data-hovercard-type="user"]');
    
    if (authorLink && authorLink.textContent.trim().toLowerCase().includes('coderabbit')) {
      // Find the parent timeline item or comment container
      let container = comment.closest('.timeline-comment-group, .js-timeline-item, .review-comment');
      if (container) {
        container.style.display = 'none';
        container.setAttribute('data-coderabbit-hidden', 'true');
        hiddenCount++;
      }
    }
  });

  return hiddenCount > 0 
    ? `Hidden ${hiddenCount} CodeRabbit comment${hiddenCount > 1 ? 's' : ''}`
    : 'No CodeRabbit comments found';
}

function showCodeRabbitComments() {
  const hiddenComments = document.querySelectorAll('[data-coderabbit-hidden="true"]');
  let shownCount = 0;

  hiddenComments.forEach(comment => {
    comment.style.display = '';
    comment.removeAttribute('data-coderabbit-hidden');
    shownCount++;
  });

  return shownCount > 0
    ? `Showed ${shownCount} CodeRabbit comment${shownCount > 1 ? 's' : ''}`
    : 'No hidden CodeRabbit comments found';
}