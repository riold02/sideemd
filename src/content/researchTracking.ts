import {
  getPageResearchQuery,
  getWebsiteFromUrl,
  isChatGptResearchUrl,
} from '../lib/researchTracking';

let lastPageCapture = '';
let lastPromptCapture = { key: '', at: 0 };
let promptDraft = '';
let navigationCaptureInstalled = false;

const CHATGPT_PROMPT_SELECTOR =
  '#prompt-textarea, textarea[data-testid="prompt-textarea"], textarea, [contenteditable="true"][role="textbox"], [contenteditable="true"]';
const CHATGPT_USER_MESSAGE_SELECTOR = '[data-message-author-role="user"]';
const SEARCH_CONTROL_HINTS = [
  'search',
  'query',
  'keyword',
  'find',
  'tim',
  'tìm',
];

function sendCapture(query: string, url: string) {
  const website = getWebsiteFromUrl(url);
  if (!website) return;

  void chrome.runtime.sendMessage({
    type: 'sideemd.research.capture',
    payload: {
      query,
      website,
      url,
      pageTitle: document.title,
    },
  });
}

function captureVisiblePage() {
  const url = window.location.href;
  const query = getPageResearchQuery(url, document.title);
  const captureKey = `${url}\n${query}`;
  if (captureKey === lastPageCapture) return;

  lastPageCapture = captureKey;
  sendCapture(query, url);
}

function schedulePageCapture() {
  for (const delay of [0, 300, 1000]) {
    window.setTimeout(captureVisiblePage, delay);
  }
}

function installNavigationCapture() {
  if (navigationCaptureInstalled) return;
  navigationCaptureInstalled = true;

  const wrapHistoryMethod = (method: 'pushState' | 'replaceState') => {
    const original = history[method];
    history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      schedulePageCapture();
      return result;
    };
  };

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
  window.addEventListener('popstate', schedulePageCapture);
  window.addEventListener('hashchange', schedulePageCapture);

  const title = document.querySelector('title');
  if (title) {
    new MutationObserver(schedulePageCapture).observe(title, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
}

function searchControlLabel(control: HTMLInputElement) {
  return [
    control.name,
    control.id,
    control.placeholder,
    control.ariaLabel,
    control.getAttribute('role'),
    control.getAttribute('title'),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isSearchControl(control: HTMLInputElement) {
  if (control.type === 'search') return true;
  if (!['', 'text'].includes(control.type)) return false;
  return SEARCH_CONTROL_HINTS.some((hint) =>
    searchControlLabel(control).includes(hint)
  );
}

function findSubmittedSearchQuery(form: HTMLFormElement) {
  for (const control of form.querySelectorAll('input')) {
    if (!(control instanceof HTMLInputElement) || !isSearchControl(control)) {
      continue;
    }
    const query = control.value.trim();
    if (query) return query;
  }
  return '';
}

function installSubmittedSearchCapture() {
  document.addEventListener(
    'submit',
    (event) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      const query = findSubmittedSearchQuery(event.target);
      if (query) {
        sendCapture(query, window.location.href);
      }
    },
    true
  );
}

function getPromptText(element: Element | null) {
  if (element instanceof HTMLTextAreaElement) {
    return element.value.trim();
  }
  if (element instanceof HTMLElement && element.isContentEditable) {
    return element.innerText.trim();
  }
  return '';
}

function findPromptField(root: ParentNode) {
  return root.querySelector(CHATGPT_PROMPT_SELECTOR);
}

function captureChatGptText(rawQuery: string) {
  const query = rawQuery.trim();
  const url = window.location.href;
  if (!query || !isChatGptResearchUrl(url)) return;

  const key = `${url}\n${query}`;
  const now = Date.now();
  if (lastPromptCapture.key === key && now - lastPromptCapture.at < 1000) {
    return;
  }

  lastPromptCapture = { key, at: now };
  sendCapture(query, url);
}

function captureChatGptPrompt(field: Element | null) {
  const query = getPromptText(field) || promptDraft;
  captureChatGptText(query);
}

function getPromptFieldFromEventTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return findPromptField(document);
  const promptField = target.closest(CHATGPT_PROMPT_SELECTOR);
  if (promptField) return promptField;

  const form = target.closest('form');
  return form ? findPromptField(form) : findPromptField(document);
}

function rememberPromptDraft(target: EventTarget | null) {
  const promptField = getPromptFieldFromEventTarget(target);
  const nextDraft = getPromptText(promptField);
  if (nextDraft) {
    promptDraft = nextDraft;
  }
}

function isSendButton(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const button = target.closest('button');
  if (!button) return false;

  const label = `${button.ariaLabel ?? ''} ${button.title ?? ''}`.toLowerCase();
  return (
    button.type === 'submit' ||
    label.includes('send') ||
    button.dataset.testid?.toLowerCase().includes('send') === true
  );
}

function captureLatestChatGptUserMessage() {
  const messages = document.querySelectorAll(CHATGPT_USER_MESSAGE_SELECTOR);
  const latest = messages[messages.length - 1];
  if (latest instanceof HTMLElement) {
    captureChatGptText(latest.innerText);
  }
}

function scheduleLatestChatGptMessageCapture() {
  for (const delay of [0, 250, 750, 1500]) {
    window.setTimeout(captureLatestChatGptUserMessage, delay);
  }
}

function installChatGptPromptCapture() {
  document.addEventListener(
    'input',
    (event) => {
      rememberPromptDraft(event.target);
    },
    true
  );

  document.addEventListener(
    'submit',
    (event) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      rememberPromptDraft(event.target);
      captureChatGptPrompt(findPromptField(event.target));
      scheduleLatestChatGptMessageCapture();
    },
    true
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
      rememberPromptDraft(event.target);
      captureChatGptPrompt(getPromptFieldFromEventTarget(event.target));
      scheduleLatestChatGptMessageCapture();
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      if (!isSendButton(event.target)) return;
      rememberPromptDraft(event.target);
      captureChatGptPrompt(getPromptFieldFromEventTarget(event.target));
      scheduleLatestChatGptMessageCapture();
    },
    true
  );

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' &&
        mutation.target instanceof HTMLElement &&
        mutation.target.matches(CHATGPT_USER_MESSAGE_SELECTOR)
      ) {
        captureChatGptText(mutation.target.innerText);
      }

      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        const message = node.matches(CHATGPT_USER_MESSAGE_SELECTOR)
          ? node
          : node.querySelector(CHATGPT_USER_MESSAGE_SELECTOR);
        if (message instanceof HTMLElement) {
          captureChatGptText(message.innerText);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-message-author-role'],
  });
}

function captureResearch() {
  installNavigationCapture();
  captureVisiblePage();

  if (isChatGptResearchUrl(window.location.href)) {
    installChatGptPromptCapture();
    return;
  }

  installSubmittedSearchCapture();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', captureResearch, {
    once: true,
  });
} else {
  captureResearch();
}
