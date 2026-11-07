export default function App() {
  return `
    <div class="app">

      <aside class="sidebar">
        <h2>📄 PDF Studio</h2>
        <p class="offline">● OFFLINE MODE</p>

        <button class="nav active" data-section="Organise">📁 Organise</button>
        <button class="nav" data-section="Edit">✏️ Edit</button>
        <button class="nav" data-section="Stamp">🔖 Stamp</button>
        <button class="nav" data-section="Convert">🔄 Convert</button>
        <button class="nav" data-section="Finish">⚙️ Finish</button>

        <div class="sidebar-bottom">
          <p>🔒 Your files stay on your device</p>
          <small>PDF Studio v1.0</small>
        </div>
      </aside>

      <main class="workspace">

        <header class="topbar">
          <div>
            <h1>PDF Workspace</h1>
            <p>Manage your documents privately.</p>
          </div>
          <span class="status">● Offline Ready</span>
        </header>

        <section class="upload-section">
          <div class="upload-icon">📄</div>
          <h2>Start working with your PDF</h2>
          <p>Choose a PDF from your computer to get started.</p>

          <label class="upload-button" for="pdfUpload">
            + Upload PDF
          </label>
          <input type="file" id="pdfUpload" accept=".pdf,application/pdf">

          <p id="fileName">No document selected</p>
        </section>

        <section class="toolbar">
          <h2 id="sectionTitle">Organise PDF</h2>
          <div class="tools" id="tools">
            <button>Merge</button>
            <button>Split</button>
            <button>Reorder</button>
            <button>Rotate</button>
            <button>Delete Pages</button>
            <button>Duplicate</button>
            <button>Extract Pages</button>
            <button>Blank Page</button>
            <button>Crop</button>
          </div>
        </section>

        <section class="preview-section">
          <div class="preview-heading">
            <h2>Document Preview</h2>
            <button id="saveButton">Save PDF</button>
          </div>

          <div id="preview" class="preview">
            <div class="empty-state">
              <div>📑</div>
              <h3>No PDF uploaded yet</h3>
              <p>Your document preview will appear here.</p>
            </div>
          </div>
        </section>

        <footer>
          🔒 100% local processing. Your documents stay on this laptop.
        </footer>

      </main>
    </div>
  `;
}