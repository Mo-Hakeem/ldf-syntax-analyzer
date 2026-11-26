import * as path from 'path';
import * as vscode from 'vscode';
import { parseLdf, serializeLdf } from './parser';
import { getLdfWebviewContent } from './webview';

const LDF_KEYWORD_DOCS: Record<string, string> = {
  LIN_protocol_version: 'LIN protocol specification version (e.g. `"2.1"`, `"2.2"`).',
  LIN_language_version: 'LDF syntax language version (e.g. `"2.1"`).',
  LIN_speed: 'LIN bus baud rate in kbps (typically `19.2 kbps` or `9.6 kbps`).',
  Nodes: 'Defines the `Master` node (timebase and jitter) and `Slaves` list.',
  Signals: 'Defines LIN signals: `<name>: <size_bits>, <init_value>, <publisher>, <subscribers>;`.',
  Frames: 'Maps signals with bit offsets into unconditional LIN frames (`<name>: <id>, <publisher>, <size_bytes>`).',
  Node_attributes: 'Slave node configuration: `LIN_protocol`, `configured_NAD`, `initial_NAD`, `product_id`, `P2_min`, `ST_min`.',
  Schedule_tables: 'Defines deterministic frame/command scheduling slots and `delay <ms>` intervals.',
  Signal_encoding_types: 'Defines `physical_value` (min, max, scale, offset, unit) and `logical_value` enums.',
  Signal_representation: 'Links `Signal_encoding_types` definitions to signal names.',
  configured_NAD: 'Configured Node Address for diagnostics (0x01..0x7F).',
  P2_min: 'Minimum time between master request and slave response.',
  ST_min: 'Minimum separation time between consecutive diagnostic frames.',
};

const TOP_SECTIONS = new Set([
  'Nodes',
  'Signals',
  'Diagnostic_signals',
  'Frames',
  'Sporadic_frames',
  'Event_triggered_frames',
  'Diagnostic_frames',
  'Node_attributes',
  'Schedule_tables',
  'Signal_encoding_types',
  'Signal_representation',
  'Signal_groups',
]);

class LdfSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const symbols: vscode.DocumentSymbol[] = [];
    let currentTop: vscode.DocumentSymbol | null = null;
    let braceDepth = 0;
    let inComment = false;

    for (let i = 0; i < document.lineCount; i++) {
      let line = document.lineAt(i).text;
      // Strip block & line comments
      let out = '';
      let idx = 0;
      while (idx < line.length) {
        if (inComment) {
          const end = line.indexOf('*/', idx);
          if (end === -1) { idx = line.length; break; }
          inComment = false;
          idx = end + 2;
        } else if (line[idx] === '/' && line[idx + 1] === '*') {
          inComment = true;
          idx += 2;
        } else if (line[idx] === '/' && line[idx + 1] === '/') {
          break;
        } else {
          out += line[idx++];
        }
      }
      const trimmed = out.trim();
      if (!trimmed) continue;

      const openB = (trimmed.match(/\{/g) || []).length;
      const closeB = (trimmed.match(/\}/g) || []).length;

      if (braceDepth === 0) {
        const nameM = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(trimmed);
        if (nameM && TOP_SECTIONS.has(nameM[1])) {
          const range = document.lineAt(i).range;
          currentTop = new vscode.DocumentSymbol(nameM[1], 'section', vscode.SymbolKind.Namespace, range, range);
          symbols.push(currentTop);
        }
      } else if (braceDepth === 1 && currentTop) {
        const subM = /^([A-Za-z_][A-Za-z0-9_]*)\s*(?::|\{)/.exec(trimmed);
        if (subM && subM[1] !== 'Master' && subM[1] !== 'Slaves') {
          const range = document.lineAt(i).range;
          currentTop.children.push(
            new vscode.DocumentSymbol(subM[1], '', vscode.SymbolKind.Field, range, range)
          );
        }
      }

      braceDepth = Math.max(0, braceDepth + openB - closeB);
      if (closeB > 0 && braceDepth === 0 && currentTop) {
        currentTop.range = new vscode.Range(currentTop.range.start, document.lineAt(i).range.end);
        currentTop = null;
      }
    }
    return symbols;
  }
}

class LdfHoverProvider implements vscode.HoverProvider {
  public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const wordRange = document.getWordRangeAtPosition(position, /0x[0-9a-fA-F]+|[A-Za-z_][A-Za-z0-9_]*/);
    if (!wordRange) return undefined;
    const word = document.getText(wordRange);
    if (LDF_KEYWORD_DOCS[word]) {
      return new vscode.Hover(new vscode.MarkdownString(`**${word}** — ${LDF_KEYWORD_DOCS[word]}`), wordRange);
    }
    if (/^0x[0-9a-fA-F]+$/.test(word)) {
      const val = parseInt(word, 16);
      return new vscode.Hover(new vscode.MarkdownString(`**${word}** = \`${val}\``), wordRange);
    }
    return undefined;
  }
}

class LdfViewProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'ldf.ldfView';

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true };
    const baseName = path.basename(document.uri.fsPath) || document.uri.fsPath;

    let ignoreNextChange = false;
    const initialParsed = parseLdf(document.getText());
    webviewPanel.webview.html = getLdfWebviewContent(initialParsed, baseName);

    const msgSub = webviewPanel.webview.onDidReceiveMessage(async (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'openRaw') {
        await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
      } else if (msg.type === 'applyData' && msg.data) {
        const nextText = serializeLdf(msg.data);
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        edit.replace(document.uri, fullRange, nextText);
        ignoreNextChange = true;
        await vscode.workspace.applyEdit(edit);
      }
    });

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (ignoreNextChange) {
        ignoreNextChange = false;
        return;
      }
      const parsed = parseLdf(document.getText());
      void webviewPanel.webview.postMessage({
        type: 'update',
        payload: { fileName: baseName, ...parsed },
      });
    });

    webviewPanel.onDidDispose(() => {
      changeSub.dispose();
      msgSub.dispose();
    });
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = { language: 'ldf' };
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(selector, new LdfSymbolProvider()),
    vscode.languages.registerHoverProvider(selector, new LdfHoverProvider()),
    vscode.window.registerCustomEditorProvider(LdfViewProvider.viewType, new LdfViewProvider(), {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('ldf.openAnalyzer', async (uri?: vscode.Uri) => {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (target) {
        await vscode.commands.executeCommand('vscode.openWith', target, LdfViewProvider.viewType);
      }
    })
  );
}

export function deactivate(): void {}
