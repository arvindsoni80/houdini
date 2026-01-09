// Severity levels to show in UI
const uiSeverities = [
  { name: 'Critical' },
  { name: 'Major' },
  { name: 'Minor' }
];

// State to track visibility of each severity level
let visibilityState = {
  'Critical': true,
  'Major': true,
  'Minor': true,
  'Informational': true,
  'Other': true
};

// Track show_all state separately
let showAllState = true;

// Store button references for each severity
let severityButtons = {};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('github.com')) {
    showStatus('Please open a GitHub PR page', 'error');
    return;
  }

  // Scan for available severities
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getAvailableSeverities
  }, (results) => {
    if (results && results[0]) {
      const availableSeverities = results[0].result;
      buildSeverityControls(availableSeverities, tab.id);
    }
  });
});

function buildSeverityControls(availableSeverities, tabId) {
  const container = document.getElementById('severityControls');
  
  // Only build UI for uiSeverities
  uiSeverities.forEach(severity => {
    const count = availableSeverities[severity.name] || 0;
    if (count === 0) return; // Don't show if no comments of this severity
    
    const group = document.createElement('div');
    group.className = 'severity-group';
    
    const label = document.createElement('div');
    label.className = 'severity-label';
    label.innerHTML = `
      <span>${severity.name}</span>
      <span style="color: #57606a; font-size: 11px;">(${count})</span>
    `;
    
    const buttons = document.createElement('div');
    buttons.className = 'toggle-buttons';
    
    const showBtn = document.createElement('button');
    showBtn.className = 'toggle-btn active';
    showBtn.textContent = 'Show';
    showBtn.onclick = () => {
      visibilityState[severity.name] = true;
      showBtn.classList.add('active');
      hideBtn.classList.remove('active');
      applyFilter(tabId);
    };
    
    const hideBtn = document.createElement('button');
    hideBtn.className = 'toggle-btn';
    hideBtn.textContent = 'Hide';
    hideBtn.onclick = () => {
      visibilityState[severity.name] = false;
      showBtn.classList.remove('active');
      hideBtn.classList.add('active');
      applyFilter(tabId);
    };
    
    // Store button references
    severityButtons[severity.name] = { showBtn, hideBtn };
    
    buttons.appendChild(showBtn);
    buttons.appendChild(hideBtn);
    
    group.appendChild(label);
    group.appendChild(buttons);
    container.appendChild(group);
  });
}

function applyFilter(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    function: applyVisibilityFilter,
    args: [visibilityState, showAllState]
  });
}

document.getElementById('showAllBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Set show_all to true and all severities to true
  showAllState = true;
  Object.keys(visibilityState).forEach(key => {
    visibilityState[key] = true;
  });
  
  // Update button states
  document.getElementById('showAllBtn').classList.add('active');
  document.getElementById('hideAllBtn').classList.remove('active');
  
  Object.values(severityButtons).forEach(({ showBtn, hideBtn }) => {
    showBtn.classList.add('active');
    hideBtn.classList.remove('active');
  });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: applyVisibilityFilter,
    args: [visibilityState, showAllState]
  });
});

document.getElementById('hideAllBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Set show_all to false and all severities to false
  showAllState = false;
  Object.keys(visibilityState).forEach(key => {
    visibilityState[key] = false;
  });
  
  // Update button states
  document.getElementById('showAllBtn').classList.remove('active');
  document.getElementById('hideAllBtn').classList.add('active');
  
  Object.values(severityButtons).forEach(({ showBtn, hideBtn }) => {
    showBtn.classList.remove('active');
    hideBtn.classList.add('active');
  });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: applyVisibilityFilter,
    args: [visibilityState, showAllState]
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  setTimeout(() => {
    status.textContent = '';
    status.className = '';
  }, 3000);
}

// Functions injected into page context

function getAvailableSeverities() {
  const comments = document.querySelectorAll('.timeline-comment-group, .js-timeline-item');
  const severityCounts = {};
  
  comments.forEach(comment => {
    const authorLink = comment.querySelector('a.author, a[data-hovercard-type="user"]');
    
    if (authorLink && authorLink.textContent.trim().toLowerCase().includes('coderabbit')) {
      const commentBody = comment.querySelector('.comment-body');
      let commentSeverity = null;
      
      if (commentBody) {
        const allEms = commentBody.querySelectorAll('em');
        
        // Check for severity in priority order: Critical > Major > Minor > Informational
        for (const em of allEms) {
          const text = em.textContent.trim();
          if (text.includes('Critical')) {
            commentSeverity = 'Critical';
            break;
          } else if (text.includes('Major') && !commentSeverity) {
            commentSeverity = 'Major';
          } else if (text.includes('Minor') && !commentSeverity) {
            commentSeverity = 'Minor';
          } else if (text.includes('Informational') && !commentSeverity) {
            commentSeverity = 'Informational';
          }
        }
      }
      
      // If no severity found, classify as "Other"
      if (!commentSeverity) {
        commentSeverity = 'Other';
      }
      
      severityCounts[commentSeverity] = (severityCounts[commentSeverity] || 0) + 1;
    }
  });
  
  return severityCounts;
}

function applyVisibilityFilter(visibilityState, showAllState) {
  const allTimelineContainers = document.querySelectorAll('.timeline-comment-group, .js-timeline-item');
  const allInlineContainers = document.querySelectorAll('.js-inline-comments-container');
  
  if (showAllState) {
    // show_all === true: Show all timeline items, hide inline comments based on severity
    
    // Show all CodeRabbit timeline items
    allTimelineContainers.forEach(container => {
      const timelineAuthorLink = container.querySelector('a.author[href="/apps/coderabbitai"]');
      if (timelineAuthorLink) {
        container.style.display = '';
        container.removeAttribute('data-coderabbit-hidden');
      }
    });
    
    // Hide/show inline comments based on severity state
    allInlineContainers.forEach(inlineContainer => {
      const inlineAuthorLink = inlineContainer.querySelector('a.author[href="/apps/coderabbitai"]');
      
      if (inlineAuthorLink) {
        const commentBody = inlineContainer.querySelector('.comment-body');
        let commentSeverity = null;
        
        if (commentBody) {
          const allEms = commentBody.querySelectorAll('em');
          
          for (const em of allEms) {
            const text = em.textContent.trim();
            if (text.includes('Critical')) {
              commentSeverity = 'Critical';
              break;
            } else if (text.includes('Major') && !commentSeverity) {
              commentSeverity = 'Major';
            } else if (text.includes('Minor') && !commentSeverity) {
              commentSeverity = 'Minor';
            } else if (text.includes('Informational') && !commentSeverity) {
              commentSeverity = 'Informational';
            }
          }
        }
        
        if (!commentSeverity) {
          commentSeverity = 'Other';
        }
        
        // Hide if severity state is false
        if (visibilityState[commentSeverity] === false) {
          inlineContainer.style.display = 'none';
          inlineContainer.setAttribute('data-coderabbit-hidden', 'true');
        } else {
          inlineContainer.style.display = '';
          inlineContainer.removeAttribute('data-coderabbit-hidden');
        }
      }
    });
    
  } else {
    // show_all === false: Show timeline + inline only if at least one inline matches severity
    
    allTimelineContainers.forEach(container => {
      const timelineAuthorLink = container.querySelector('a.author[href="/apps/coderabbitai"]');
      
      if (timelineAuthorLink) {
        // Find all inline containers within this timeline item
        const inlineContainersInTimeline = container.querySelectorAll('.js-inline-comments-container');
        let hasVisibleInline = false;
        
        inlineContainersInTimeline.forEach(inlineContainer => {
          const inlineAuthorLink = inlineContainer.querySelector('a.author[href="/apps/coderabbitai"]');
          
          if (inlineAuthorLink) {
            const commentBody = inlineContainer.querySelector('.comment-body');
            let commentSeverity = null;
            
            if (commentBody) {
              const allEms = commentBody.querySelectorAll('em');
              
              for (const em of allEms) {
                const text = em.textContent.trim();
                if (text.includes('Critical')) {
                  commentSeverity = 'Critical';
                  break;
                } else if (text.includes('Major') && !commentSeverity) {
                  commentSeverity = 'Major';
                } else if (text.includes('Minor') && !commentSeverity) {
                  commentSeverity = 'Minor';
                } else if (text.includes('Informational') && !commentSeverity) {
                  commentSeverity = 'Informational';
                }
              }
            }
            
            if (!commentSeverity) {
              commentSeverity = 'Other';
            }
            
            // Show inline if severity state is true
            if (visibilityState[commentSeverity] === true) {
              inlineContainer.style.display = '';
              inlineContainer.removeAttribute('data-coderabbit-hidden');
              hasVisibleInline = true;
            } else {
              inlineContainer.style.display = 'none';
              inlineContainer.setAttribute('data-coderabbit-hidden', 'true');
            }
          }
        });
        
        // Show timeline item only if at least one inline is visible
        if (hasVisibleInline) {
          container.style.display = '';
          container.removeAttribute('data-coderabbit-hidden');
        } else {
          container.style.display = 'none';
          container.setAttribute('data-coderabbit-hidden', 'true');
        }
      }
    });
  }
}