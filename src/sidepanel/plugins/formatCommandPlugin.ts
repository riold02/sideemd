import {
  activeEditor$,
  addActivePlugin$,
  realmPlugin,
} from '@mdxeditor/editor';
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from '@lexical/selection';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical';
import { registerFormatCommandBridge } from '../formatCommandBridge';
import type { QuickFormat } from '../utils/editorFormat';

const LEXICAL_FORMATS = new Set<TextFormatType>([
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'code',
  'highlight',
  'subscript',
  'superscript',
]);

function applyBorderStyle(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) return;

    const hasBorder = Boolean(
      $getSelectionStyleValueForProperty(selection, 'border', '')
    );

    $patchStyleText(
      selection,
      hasBorder
        ? { border: null, 'border-radius': null, padding: null }
        : {
            border: '1px solid rgba(30, 31, 36, 0.45)',
            'border-radius': '3px',
            padding: '0 2px',
          }
    );
  });
  editor.focus();
}

export const formatCommandPlugin = realmPlugin({
  init(realm) {
    realm.pub(addActivePlugin$, 'formatCommand');

    realm.sub(activeEditor$, (editor) => {
      if (!editor) {
        registerFormatCommandBridge(null);
        return;
      }

      registerFormatCommandBridge({
        applyFormat(format: QuickFormat) {
          if (format === 'border') {
            applyBorderStyle(editor);
            return;
          }
          if (LEXICAL_FORMATS.has(format as TextFormatType)) {
            editor.dispatchCommand(
              FORMAT_TEXT_COMMAND,
              format as TextFormatType
            );
            editor.focus();
          }
        },
      });
    });
  },
});
