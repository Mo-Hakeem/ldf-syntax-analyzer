# LinMap — LDF Syntax & Analyzer

Syntax highlighting, outline symbols, hover docs, and an interactive **LDF Network Analyzer** for LIN Description Files (`.ldf`).

## Features

- **Syntax highlighting** — `LIN_description_file`, `Nodes`, `Signals`, `Frames`, `Node_attributes`, `Schedule_tables`, `Signal_encoding_types`, `Signal_representation`, diagnostic frames, units (`kbps`, `ms`), hex/numeric literals, strings, and comments.
- **Outline & Smart Hover** — `Ctrl+Shift+O` navigation and quick docs on LDF keywords and hex values.
- **Interactive LDF Analyzer** (click the graph icon in the editor title bar):
  - **Overview & Nodes**: Protocol/language version, baud rate, Master timing, Slave nodes, NADs, and product IDs.
  - **Frames**: Frame ID, publisher, DLC, mapped signals, and an interactive **8-byte (64-bit) bit-layout visualizer**.
  - **Signals**: Bit size, initial value, publisher, subscribers, and linked encoding/unit.
  - **Schedule Tables**: Command/frame sequence, slot delays (`ms`), and total cycle time.
  - **Signal Encodings**: Physical scale/offset/min/max/unit and logical enum values.

## Building from source

```sh
npm install
npm run compile
```

Package an OPC-compliant `.vsix`:

```powershell
.\make_icon.ps1
.\make_vsix.ps1
```

## License

MIT — see [LICENSE](LICENSE).
