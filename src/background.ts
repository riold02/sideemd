import { ChromeStorageRepository } from './lib/storage';
import {
  canTrackResearchUrl,
  hasRecentResearchCapture,
} from './lib/researchTracking';

const repository = new ChromeStorageRepository();

async function configureSidePanel(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

chrome.runtime.onInstalled.addListener(() => {
  void configureSidePanel();
});

chrome.runtime.onStartup.addListener(() => {
  void configureSidePanel();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-side-panel') {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.windowId) {
    return;
  }

  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!message || typeof message !== 'object') return;
  const capture = message as {
    type?: string;
    payload?: {
      query?: string;
      website?: string;
      url?: string;
      pageTitle?: string;
    };
  };
  if (capture.type !== 'sideemd.research.capture') return;
  const { payload } = capture;
  if (
    !payload ||
    typeof payload.query !== 'string' ||
    typeof payload.website !== 'string' ||
    typeof payload.url !== 'string' ||
    typeof payload.pageTitle !== 'string'
  ) {
    return;
  }

  void repository.getState().then((state) => {
    if (!canTrackResearchUrl(state.trackingSettings, payload.url as string)) {
      return;
    }
    const recentLogs = state.researchLogOrder
      .slice(0, 50)
      .map((id) => state.researchLogs[id])
      .filter(Boolean);
    if (
      hasRecentResearchCapture(recentLogs, {
        query: payload.query as string,
        url: payload.url as string,
      })
    ) {
      return;
    }
    return repository.createResearchLog({
      query: payload.query as string,
      website: payload.website as string,
      url: payload.url as string,
      pageTitle: payload.pageTitle as string,
      personalNote: '',
    });
  });
});
