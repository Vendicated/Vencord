import { definePluginSettings } from '@api/Settings';
import { Devs } from '@utils/constants';
import definePlugin, { OptionType } from '@utils/types';
import { openModal, React } from '@webpack/common';
import { SearchModal } from './components/SearchModal.js';
import './styles.css';

export const settings = definePluginSettings({
  maxResults: {
    type: OptionType.SELECT,
    description: 'Maximum number of message search results',
    options: [
      { label: '25 results', value: '25' },
      { label: '50 results', value: '50' },
      { label: '100 results (Default)', value: '100', default: true },
      { label: '250 results', value: '250' },
      { label: '500 results', value: '500' },
    ] as const,
  },
  searchGroupDms: {
    type: OptionType.BOOLEAN,
    description: 'Search across Group DMs as well as 1-to-1 DMs',
    default: true,
  },
  highlightSearchTerms: {
    type: OptionType.BOOLEAN,
    description: 'Highlight matching query words in search result text',
    default: true,
  },
  openExactMessage: {
    type: OptionType.BOOLEAN,
    description: 'Jump to and focus the exact matching message on click',
    default: true,
  },
});

let isModalOpen = false;

export function openAllDmSearchModal() {
  if (isModalOpen) return;
  isModalOpen = true;

  try {
    openModal((modalProps: any) => (
      <SearchModal
        modalProps={modalProps}
        onClose={() => {
          isModalOpen = false;
          if (modalProps?.onClose) {
            modalProps.onClose();
          }
        }}
        maxResults={Number(settings.store.maxResults ?? 100)}
        searchGroupDms={settings.store.searchGroupDms ?? true}
        highlightSearchTerms={settings.store.highlightSearchTerms ?? true}
      />
    ));
  } catch (e) {
    isModalOpen = false;
    console.error('[AllDmSearch] Failed to open modal:', e);
  }
}

let keydownListener: ((e: KeyboardEvent) => void) | null = null;

export default definePlugin({
  name: 'AllDmSearch',
  description: 'Search messages across accessible Discord DMs from one interface.',
  tags: ['Utility', 'Chat'],
  authors: [Devs.Sudipta],

  settings,

  start() {
    console.log('[AllDmSearch] Starting All DM Message Search plugin...');

    // Register Global Keyboard Shortcut: Cmd + Shift + F (Mac) / Ctrl + Shift + F (Win/Linux)
    keydownListener = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        e.stopPropagation();
        openAllDmSearchModal();
      }
    };

    window.addEventListener('keydown', keydownListener, true);
  },

  stop() {
    console.log('[AllDmSearch] Stopping All DM Message Search plugin...');
    if (keydownListener) {
      window.removeEventListener('keydown', keydownListener, true);
      keydownListener = null;
    }
  },
});
