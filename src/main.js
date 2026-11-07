import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import './style.css';
import App from './App.js';
import { PDFDocument, degrees, rgb } from 'pdf-lib';

document.querySelector('#app').innerHTML = App();

let currentPDF = null;
let currentURL = null;

const upload = document.getElementById('pdfUpload');
const preview = document.getElementById('preview');

// Upload and preview PDF
upload.addEventListener('change', (event) => {
  const file = event.target.files[0];

  if (!file) return;

  if (file.type !== 'application/pdf' &&
      !file.name.toLowerCase().endsWith('.pdf')) {
    alert('Please select a PDF file.');
    return;
  }

  if (currentURL) URL.revokeObjectURL(currentURL);

  currentPDF = file;
  currentURL = URL.createObjectURL(file);

  document.getElementById('fileName').textContent =
    file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';

  preview.innerHTML = `
    <iframe
      src="${currentURL}"
      title="PDF Preview"
      width="100%"
      height="600px">
    </iframe>
  `;
});

// Download current PDF
document.getElementById('saveButton').addEventListener('click', () => {
  if (!currentPDF) {
    alert('Please upload a PDF first.');
    return;
  }

  const link = document.createElement('a');
  link.href = currentURL;
  link.download = currentPDF.name;
  link.click();
});

// PDF tool categories
const toolGroups = {
  Organise: [
    'Merge', 'Split', 'Reorder', 'Rotate',
    'Delete Pages', 'Duplicate', 'Extract Pages',
    'Blank Page', 'Crop'
  ],

  Edit: [
    'Add Text', 'Add Image', 'Highlight', 'Draw',
    'Shapes', 'Whiteout', 'Redact', 'Sign', 'Fill Forms'
  ],

  Stamp: [
    'Watermark', 'Page Numbers',
    'Header & Footer', 'Date Stamp'
  ],

  Convert: [
    'Images to PDF', 'PDF to Images', 'PDF to Text'
  ],

  Finish: [
    'Compress', 'Edit Details',
    'Remove Details', 'Compare PDFs'
  ]
};

// Sidebar navigation
document.querySelectorAll('.nav').forEach(button => {
  button.addEventListener('click', () => {

    document.querySelectorAll('.nav').forEach(item => {
      item.classList.remove('active');
    });

    button.classList.add('active');

    const section = button.dataset.section;

    document.getElementById('sectionTitle').textContent =
      section + ' PDF';

    document.getElementById('tools').innerHTML =
      toolGroups[section].map(tool =>
        `<button data-tool="${tool}">${tool}</button>`
      ).join('');
  });
});

// Merge PDF functionality
async function mergePDFs(files) {
  if (files.length < 2) {
    alert('Please select at least 2 PDF files.');
    return;
  }

  try {
    const mergedPDF = await PDFDocument.create();

    for (const file of files) {
      const bytes = await file.arrayBuffer();

      const pdf = await PDFDocument.load(bytes);

      const pages = await mergedPDF.copyPages(
        pdf,
        pdf.getPageIndices()
      );

      pages.forEach(page => mergedPDF.addPage(page));
    }

    const mergedBytes = await mergedPDF.save();

    const blob = new Blob([mergedBytes], {
      type: 'application/pdf'
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'Merged-PDF.pdf';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    alert('PDF files merged successfully!');

  } catch (error) {
    console.error(error);
    alert('Unable to merge these PDFs. Please check that they are valid and not password protected.');
  }
}
async function splitPDF() {
  const fileInput = document.createElement('input');

  fileInput.type = 'file';
  fileInput.accept = '.pdf,application/pdf';

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];

    if (!file) return;

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      const totalPages = pdf.getPageCount();

      const input = prompt(
        `This PDF has ${totalPages} pages.\nEnter pages or ranges (example: 1-3,5,8-10):`
      );

      if (!input) return;

      const pageNumbers = new Set();

      for (const part of input.split(',')) {
        const range = part.trim();

        if (/^\d+$/.test(range)) {
          pageNumbers.add(Number(range));
        } else if (/^\d+-\d+$/.test(range)) {
          const [start, end] = range.split('-').map(Number);

          if (start > end) {
            throw new Error('Invalid page range.');
          }

          for (let i = start; i <= end; i++) {
            pageNumbers.add(i);
          }
        } else {
          throw new Error('Invalid page selection.');
        }
      }

      const selectedPages = [...pageNumbers].sort((a, b) => a - b);

      if (
        selectedPages.length === 0 ||
        selectedPages.some(page => page < 1 || page > totalPages)
      ) {
        throw new Error('Please enter valid page numbers.');
      }

      const newPDF = await PDFDocument.create();

      const copiedPages = await newPDF.copyPages(
        pdf,
        selectedPages.map(page => page - 1)
      );

      copiedPages.forEach(page => newPDF.addPage(page));

      const result = await newPDF.save();

      const blob = new Blob([result], {
        type: 'application/pdf'
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'Split-PDF.pdf';

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      alert('Selected pages extracted successfully!');

    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to split PDF.');
    }
  });

  fileInput.click();
}
async function reorderPDF() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,application/pdf';

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;

    try {
      const pdf = await PDFDocument.load(
        await file.arrayBuffer()
      );

      const total = pdf.getPageCount();

      const order = prompt(
        `This PDF has ${total} pages.\nEnter the new page order, separated by commas.\nExample: 3,1,2,4`
      );

      if (!order) return;

      const pages = order.split(',').map(x => Number(x.trim()));

      if (
        pages.length !== total ||
        pages.some(x => !Number.isInteger(x) || x < 1 || x > total) ||
        new Set(pages).size !== total
      ) {
        alert(`Enter every page number from 1 to ${total} exactly once.`);
        return;
      }

      const output = await PDFDocument.create();

      const copied = await output.copyPages(
        pdf,
        pages.map(x => x - 1)
      );

      copied.forEach(page => output.addPage(page));

      const bytes = await output.save();

      const url = URL.createObjectURL(
        new Blob([bytes], { type: 'application/pdf' })
      );

      const link = document.createElement('a');
      link.href = url;
      link.download = 'Reordered-PDF.pdf';
      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      alert('PDF pages reordered successfully!');

    } catch (error) {
      console.error(error);
      alert('Unable to reorder this PDF.');
    }
  };

  fileInput.click();
}
async function rotatePDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];

        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const selection = prompt(
                `PDF has ${total} pages. Enter page numbers separated by commas, or type ALL:`,
                'ALL'
            );

            if (!selection) return;

            const angleInput = prompt(
                'Enter rotation angle: 90, 180 or 270',
                '90'
            );

            const angle = Number(angleInput);

            if (![90, 180, 270].includes(angle)) {
                alert('Please enter 90, 180 or 270.');
                return;
            }

            let pageNumbers;

            if (selection.trim().toUpperCase() === 'ALL') {
                pageNumbers = Array.from(
                    { length: total },
                    (_, i) => i + 1
                );
            } else {
                pageNumbers = selection.split(',').map(Number);

                if (
                    pageNumbers.some(
                        n => !Number.isInteger(n) || n < 1 || n > total
                    ) ||
                    new Set(pageNumbers).size !== pageNumbers.length
                ) {
                    alert('Invalid page numbers.');
                    return;
                }
            }

            pageNumbers.forEach(number => {
                const page = pdf.getPage(number - 1);
                const current = page.getRotation().angle;

                page.setRotation(
                    degrees((current + angle) % 360)
                );
            });

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Rotated-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('PDF rotated successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to rotate this PDF.');
        }
    };

    fileInput.click();
}
async function deletePagesPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const input = prompt(
                `PDF has ${total} pages. Enter page numbers to delete, separated by commas:`
            );

            if (!input) return;

            const pages = input.split(',').map(Number);

            if (
                pages.some(n =>
                    !Number.isInteger(n) || n < 1 || n > total
                ) ||
                new Set(pages).size !== pages.length ||
                pages.length >= total
            ) {
                alert('Invalid page numbers. Keep at least one page.');
                return;
            }

            // Delete from highest page number to lowest
            pages.sort((a, b) => b - a);

            pages.forEach(number => {
                pdf.removePage(number - 1);
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Pages-Deleted.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Selected pages deleted successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to delete pages.');
        }
    };

    fileInput.click();
}
async function duplicatePagesPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const input = prompt(
                `PDF has ${total} pages. Enter page numbers to duplicate, separated by commas:`
            );

            if (!input) return;

            const pages = input.split(',').map(Number);

            if (
                pages.some(n =>
                    !Number.isInteger(n) || n < 1 || n > total
                )
            ) {
                alert('Invalid page numbers.');
                return;
            }

            for (const number of pages) {
                const [copiedPage] = await pdf.copyPages(
                    pdf,
                    [number - 1]
                );

                pdf.addPage(copiedPage);
            }

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Duplicated-Pages.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Pages duplicated successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to duplicate pages.');
        }
    };

    fileInput.click();
}
async function extractPagesPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const sourcePDF = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = sourcePDF.getPageCount();

            const input = prompt(
                `PDF has ${total} pages. Enter page numbers to extract, separated by commas:`
            );

            if (!input) return;

            const pages = input.split(',').map(Number);

            if (
                pages.some(n =>
                    !Number.isInteger(n) || n < 1 || n > total
                ) ||
                new Set(pages).size !== pages.length
            ) {
                alert('Invalid page numbers.');
                return;
            }

            const newPDF = await PDFDocument.create();

            const copiedPages = await newPDF.copyPages(
                sourcePDF,
                pages.map(n => n - 1)
            );

            copiedPages.forEach(page => newPDF.addPage(page));

            const bytes = await newPDF.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Extracted-Pages.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Pages extracted successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to extract pages.');
        }
    };

    fileInput.click();
}
async function addBlankPagePDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const positionInput = prompt(
                `PDF has ${total} pages. Enter the position for the blank page (1 to ${total + 1}):`,
                String(total + 1)
            );

            if (positionInput === null) return;

            const position = Number(positionInput);

            if (
                !Number.isInteger(position) ||
                position < 1 ||
                position > total + 1
            ) {
                alert('Invalid page position.');
                return;
            }

            const [width, height] = pdf.getPage(0).getSize();

            pdf.insertPage(position - 1, [width, height]);

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'PDF-With-Blank-Page.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Blank page added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to add a blank page.');
        }
    };

    fileInput.click();
}
async function cropPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const pageInput = prompt(
                `PDF has ${total} pages. Enter page number to crop, or ALL:`,
                'ALL'
            );

            if (!pageInput) return;

            let pages;

            if (pageInput.trim().toUpperCase() === 'ALL') {
                pages = Array.from(
                    { length: total },
                    (_, i) => i + 1
                );
            } else {
                pages = pageInput.split(',').map(Number);

                if (
                    pages.some(n =>
                        !Number.isInteger(n) || n < 1 || n > total
                    ) ||
                    new Set(pages).size !== pages.length
                ) {
                    alert('Invalid page numbers.');
                    return;
                }
            }

            const left = Number(prompt('Enter left margin in points:', '30'));
            const bottom = Number(prompt('Enter bottom margin in points:', '30'));
            const right = Number(prompt('Enter right margin in points:', '30'));
            const top = Number(prompt('Enter top margin in points:', '30'));

            if (![left, bottom, right, top].every(
                n => Number.isFinite(n) && n >= 0
            )) {
                alert('Margins must be valid non-negative numbers.');
                return;
            }

            for (const number of pages) {
                const page = pdf.getPage(number - 1);
                const { width, height } = page.getSize();

                if (
                    left + right >= width ||
                    top + bottom >= height
                ) {
                    alert(`Margins are too large for page ${number}.`);
                    return;
                }

                page.setCropBox(
                    left,
                    bottom,
                    width - left - right,
                    height - top - bottom
                );
            }

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Cropped-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('PDF cropped successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to crop this PDF.');
        }
    };

    fileInput.click();
}
async function addTextPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const pageInput = prompt(
                `PDF has ${total} pages. Enter page number:`,
                '1'
            );

            if (pageInput === null) return;

            const pageNumber = Number(pageInput);

            if (
                !Number.isInteger(pageNumber) ||
                pageNumber < 1 ||
                pageNumber > total
            ) {
                alert('Invalid page number.');
                return;
            }

            const text = prompt('Enter the text to add:');

            if (!text) return;

            const fontSize = Number(
                prompt('Enter font size:', '20')
            );

            if (
                !Number.isFinite(fontSize) ||
                fontSize < 1 ||
                fontSize > 200
            ) {
                alert('Enter a font size between 1 and 200.');
                return;
            }

            const page = pdf.getPage(pageNumber - 1);
            const { width, height } = page.getSize();

            const x = Number(
                prompt(`Enter horizontal position (0 to ${width}):`, '50')
            );

            const y = Number(
                prompt(`Enter vertical position (0 to ${height}):`, '100')
            );

            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                x < 0 || x > width ||
                y < 0 || y > height
            ) {
                alert('Invalid text position.');
                return;
            }

            page.drawText(text, {
                x,
                y,
                size: fontSize,
                color: rgb(0, 0, 0)
            });

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Text-Added-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Text added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to add text.');
        }
    };

    fileInput.click();
}
async function addImagePDF() {
    const pdfInput = document.createElement('input');
    pdfInput.type = 'file';
    pdfInput.accept = '.pdf,application/pdf';

    pdfInput.onchange = async () => {
        const pdfFile = pdfInput.files[0];
        if (!pdfFile) return;

        try {
            const pdf = await PDFDocument.load(
                await pdfFile.arrayBuffer()
            );

            const imageInput = document.createElement('input');
            imageInput.type = 'file';
            imageInput.accept = 'image/png,image/jpeg';

            imageInput.onchange = async () => {
                const imageFile = imageInput.files[0];
                if (!imageFile) return;

                try {
                    const imageBytes = await imageFile.arrayBuffer();

                    let image;

                    if (imageFile.type === 'image/png') {
                        image = await pdf.embedPng(imageBytes);
                    } else if (imageFile.type === 'image/jpeg') {
                        image = await pdf.embedJpg(imageBytes);
                    } else {
                        alert('Please select a PNG or JPG image.');
                        return;
                    }

                    const total = pdf.getPageCount();

                    const pageInput = prompt(
                        `PDF has ${total} pages. Enter page number:`,
                        '1'
                    );

                    if (pageInput === null) return;

                    const pageNumber = Number(pageInput);

                    if (
                        !Number.isInteger(pageNumber) ||
                        pageNumber < 1 ||
                        pageNumber > total
                    ) {
                        alert('Invalid page number.');
                        return;
                    }

                    const page = pdf.getPage(pageNumber - 1);
                    const { width, height } = page.getSize();

                    const imageWidth = Math.min(150, width - 20);
                    const imageHeight =
                        image.height * imageWidth / image.width;

                    page.drawImage(image, {
                        x: 50,
                        y: Math.max(10, height - imageHeight - 50),
                        width: imageWidth,
                        height: imageHeight
                    });

                    const bytes = await pdf.save();

                    const blob = new Blob([bytes], {
                        type: 'application/pdf'
                    });

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');

                    link.href = url;
                    link.download = 'Image-Added-PDF.pdf';
                    link.click();

                    setTimeout(() => URL.revokeObjectURL(url), 1000);

                    alert('Image added successfully!');

                } catch (error) {
                    console.error(error);
                    alert('Unable to add image.');
                }
            };

            imageInput.click();

        } catch (error) {
            console.error(error);
            alert('Unable to open PDF.');
        }
    };

    pdfInput.click();
}
async function highlightPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const pageInput = prompt(
                `PDF has ${total} pages. Enter page number:`,
                '1'
            );

            if (pageInput === null) return;

            const pageNumber = Number(pageInput);

            if (
                !Number.isInteger(pageNumber) ||
                pageNumber < 1 ||
                pageNumber > total
            ) {
                alert('Invalid page number.');
                return;
            }

            const page = pdf.getPage(pageNumber - 1);
            const { width, height } = page.getSize();

            const x = Number(prompt(`Enter X position (0-${width}):`, '50'));
            const y = Number(prompt(`Enter Y position (0-${height}):`, '100'));
            const boxWidth = Number(prompt('Enter highlight width:', '200'));
            const boxHeight = Number(prompt('Enter highlight height:', '25'));

            if (
                ![x, y, boxWidth, boxHeight].every(Number.isFinite) ||
                x < 0 || y < 0 ||
                boxWidth <= 0 || boxHeight <= 0 ||
                x + boxWidth > width ||
                y + boxHeight > height
            ) {
                alert('Invalid highlight dimensions or position.');
                return;
            }

            page.drawRectangle({
                x,
                y,
                width: boxWidth,
                height: boxHeight,
                color: rgb(1, 1, 0),
                opacity: 0.35,
                borderWidth: 0
            });

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Highlighted-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Highlight added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to highlight PDF.');
        }
    };

    fileInput.click();
}
async function drawPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const pageInput = prompt(
                `PDF has ${total} pages. Enter page number:`,
                '1'
            );

            if (pageInput === null) return;

            const pageNumber = Number(pageInput);

            if (
                !Number.isInteger(pageNumber) ||
                pageNumber < 1 ||
                pageNumber > total
            ) {
                alert('Invalid page number.');
                return;
            }

            const page = pdf.getPage(pageNumber - 1);
            const { width, height } = page.getSize();

            const x1 = Number(prompt('Enter starting X position:', '50'));
            const y1 = Number(prompt('Enter starting Y position:', '100'));
            const x2 = Number(prompt('Enter ending X position:', '200'));
            const y2 = Number(prompt('Enter ending Y position:', '150'));

            if (
                ![x1, y1, x2, y2].every(Number.isFinite) ||
                [x1, x2].some(x => x < 0 || x > width) ||
                [y1, y2].some(y => y < 0 || y > height)
            ) {
                alert('Invalid drawing coordinates.');
                return;
            }

            page.drawLine({
                start: { x: x1, y: y1 },
                end: { x: x2, y: y2 },
                thickness: 3,
                color: rgb(0, 0, 1)
            });

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Drawn-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Drawing added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to draw on PDF.');
        }
    };

    fileInput.click();
}
async function addShapesPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const pageInput = prompt(
                `PDF has ${total} pages. Enter page number:`,
                '1'
            );

            if (pageInput === null) return;

            const pageNumber = Number(pageInput);

            if (
                !Number.isInteger(pageNumber) ||
                pageNumber < 1 ||
                pageNumber > total
            ) {
                alert('Invalid page number.');
                return;
            }

            const shape = prompt(
                'Choose a shape: rectangle, circle or line',
                'rectangle'
            );

            if (!shape) return;

            const page = pdf.getPage(pageNumber - 1);
            const { width, height } = page.getSize();

            const x = Number(prompt('Enter X position:', '50'));
            const y = Number(prompt('Enter Y position:', '100'));

            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                x < 0 || x > width ||
                y < 0 || y > height
            ) {
                alert('Invalid position.');
                return;
            }

            if (shape.toLowerCase() === 'rectangle') {
                const w = Number(prompt('Enter rectangle width:', '150'));
                const h = Number(prompt('Enter rectangle height:', '80'));

                if (
                    !Number.isFinite(w) ||
                    !Number.isFinite(h) ||
                    w <= 0 || h <= 0 ||
                    x + w > width || y + h > height
                ) {
                    alert('Invalid rectangle dimensions.');
                    return;
                }

                page.drawRectangle({
                    x, y,
                    width: w,
                    height: h,
                    borderColor: rgb(0, 0, 1),
                    borderWidth: 3
                });

            } else if (shape.toLowerCase() === 'circle') {
                const radius = Number(prompt('Enter circle radius:', '40'));

                if (
                    !Number.isFinite(radius) ||
                    radius <= 0 ||
                    x - radius < 0 ||
                    x + radius > width ||
                    y - radius < 0 ||
                    y + radius > height
                ) {
                    alert('Invalid circle radius or position.');
                    return;
                }

                page.drawCircle({
                    x, y,
                    size: radius,
                    borderColor: rgb(1, 0, 0),
                    borderWidth: 3
                });

            } else if (shape.toLowerCase() === 'line') {
                const x2 = Number(prompt('Enter ending X position:', '200'));
                const y2 = Number(prompt('Enter ending Y position:', '150'));

                if (
                    !Number.isFinite(x2) ||
                    !Number.isFinite(y2) ||
                    x2 < 0 || x2 > width ||
                    y2 < 0 || y2 > height
                ) {
                    alert('Invalid ending position.');
                    return;
                }

                page.drawLine({
                    start: { x, y },
                    end: { x: x2, y: y2 },
                    thickness: 3,
                    color: rgb(0, 0.5, 0)
                });

            } else {
                alert('Please choose rectangle, circle or line.');
                return;
            }

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Shapes-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Shape added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to add shape.');
        }
    };

    fileInput.click();
}
async function whiteoutPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const pageInput = prompt(
                `PDF has ${total} pages. Enter page number:`,
                '1'
            );

            if (pageInput === null) return;

            const pageNumber = Number(pageInput);

            if (
                !Number.isInteger(pageNumber) ||
                pageNumber < 1 ||
                pageNumber > total
            ) {
                alert('Invalid page number.');
                return;
            }

            const page = pdf.getPage(pageNumber - 1);
            const { width, height } = page.getSize();

            const x = Number(prompt('Enter X position:', '50'));
            const y = Number(prompt('Enter Y position:', '100'));
            const boxWidth = Number(prompt('Enter whiteout width:', '150'));
            const boxHeight = Number(prompt('Enter whiteout height:', '40'));

            if (
                ![x, y, boxWidth, boxHeight].every(Number.isFinite) ||
                x < 0 || y < 0 ||
                boxWidth <= 0 || boxHeight <= 0 ||
                x + boxWidth > width ||
                y + boxHeight > height
            ) {
                alert('Invalid whiteout dimensions or position.');
                return;
            }

            page.drawRectangle({
                x,
                y,
                width: boxWidth,
                height: boxHeight,
                color: rgb(1, 1, 1),
                borderWidth: 0
            });

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Whiteout-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Whiteout applied successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to apply whiteout.');
        }
    };

    fileInput.click();
}
async function redactPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const pageNumber = Number(
                prompt(`PDF has ${total} pages. Enter page number:`, '1')
            );

            if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > total) {
                alert('Invalid page number.');
                return;
            }

            const page = pdf.getPage(pageNumber - 1);
            const { width, height } = page.getSize();

            const x = Number(prompt('Enter X position:', '50'));
            const y = Number(prompt('Enter Y position:', '100'));
            const w = Number(prompt('Enter blackout width:', '150'));
            const h = Number(prompt('Enter blackout height:', '40'));

            if (
                ![x, y, w, h].every(Number.isFinite) ||
                x < 0 || y < 0 || w <= 0 || h <= 0 ||
                x + w > width || y + h > height
            ) {
                alert('Invalid position or dimensions.');
                return;
            }

            page.drawRectangle({
                x,
                y,
                width: w,
                height: h,
                color: rgb(0, 0, 0),
                borderWidth: 0
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'Blackout-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Blackout applied successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to apply blackout.');
        }
    };

    fileInput.click();
}
async function signPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const total = pdf.getPageCount();

            const pageNumber = Number(
                prompt(`PDF has ${total} pages. Enter page number:`, '1')
            );

            if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > total) {
                alert('Invalid page number.');
                return;
            }

            const name = prompt('Enter your signature name:');

            if (!name || !name.trim()) {
                alert('Please enter a name.');
                return;
            }

            const page = pdf.getPage(pageNumber - 1);
            const { width, height } = page.getSize();

            const x = Number(prompt('Enter X position:', '50'));
            const y = Number(prompt('Enter Y position:', '100'));

            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                x < 0 || y < 0 || x > width || y > height
            ) {
                alert('Invalid signature position.');
                return;
            }

            page.drawText(name.trim(), {
                x,
                y,
                size: 24,
                color: rgb(0, 0, 0)
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'Signed-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Signature added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to sign PDF.');
        }
    };

    fileInput.click();
}
async function fillFormsPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const form = pdf.getForm();
            const fields = form.getFields();

            if (fields.length > 0) {
                const fieldNames = fields.map(field => field.getName());
                const selectedName = prompt(
                    'Available form fields:\n' + fieldNames.join('\n') +
                    '\n\nEnter the exact field name to fill:'
                );

                if (!selectedName) return;

                const field = fields.find(
                    item => item.getName() === selectedName
                );

                if (!field) {
                    alert('Field not found.');
                    return;
                }

                if (typeof field.setText !== 'function') {
                    alert('This field is not a text field.');
                    return;
                }

                const value = prompt('Enter the text:');
                if (value === null) return;

                field.setText(value);
            } else {
                alert('No interactive form fields found in this PDF.');
                return;
            }

            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'Filled-Forms-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Form filled successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to fill PDF form.');
        }
    };

    fileInput.click();
}
async function watermarkPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const text = prompt('Enter watermark text:', 'CONFIDENTIAL');
            if (!text || !text.trim()) return;

            pdf.getPages().forEach(page => {
                const { width, height } = page.getSize();

                page.drawText(text.trim(), {
                    x: width / 4,
                    y: height / 2,
                    size: 35,
                    color: rgb(0.7, 0.7, 0.7),
                    opacity: 0.35
                });
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'Watermarked-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Watermark added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to add watermark.');
        }
    };

    fileInput.click();
}
async function addPageNumbersPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const pages = pdf.getPages();

            pages.forEach((page, index) => {
                const { width } = page.getSize();

                page.drawText(`${index + 1}`, {
                    x: width / 2,
                    y: 25,
                    size: 12,
                    color: rgb(0, 0, 0)
                });
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'Numbered-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Page numbers added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to add page numbers.');
        }
    };

    fileInput.click();
}
async function headerFooterPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const header = prompt('Enter header text (leave blank to skip):', 'PDF Studio');
            const footer = prompt('Enter footer text (leave blank to skip):', 'Thank you');

            if (header === null || footer === null) return;

            pdf.getPages().forEach(page => {
                const { width, height } = page.getSize();

                if (header.trim()) {
                    page.drawText(header.trim(), {
                        x: 40,
                        y: height - 30,
                        size: 12,
                        color: rgb(0, 0, 0)
                    });
                }

                if (footer.trim()) {
                    page.drawText(footer.trim(), {
                        x: 40,
                        y: 20,
                        size: 10,
                        color: rgb(0, 0, 0)
                    });
                }
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'Header-Footer-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Header and footer added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to add header and footer.');
        }
    };

    fileInput.click();
}
async function dateStampPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const today = new Date().toLocaleDateString('en-IN');

            pdf.getPages().forEach(page => {
                const { width } = page.getSize();

                page.drawText(today, {
                    x: width - 120,
                    y: 25,
                    size: 11,
                    color: rgb(0, 0, 0)
                });
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'Date-Stamped-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Date stamp added successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to add date stamp.');
        }
    };

    fileInput.click();
}
async function imagesToPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg';
    fileInput.multiple = true;

    fileInput.onchange = async () => {
        const files = Array.from(fileInput.files);
        if (files.length === 0) return;

        try {
            const pdf = await PDFDocument.create();

            for (const file of files) {
                const imageBytes = await file.arrayBuffer();
                const isPNG = file.type === 'image/png';

                const image = isPNG
                    ? await pdf.embedPng(imageBytes)
                    : await pdf.embedJpg(imageBytes);

                const page = pdf.addPage([
                    image.width,
                    image.height
                ]);

                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height
                });
            }

            const bytes = await pdf.save();
            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Images-Converted-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Images converted to PDF successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to convert images. Please use JPG or PNG files.');
        }
    };

    fileInput.click();
}
async function pdfToImages() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await pdfjsLib.getDocument({
                data: await file.arrayBuffer()
            }).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport
                }).promise;

                const blob = await new Promise(resolve =>
                    canvas.toBlob(resolve, 'image/png')
                );

                if (!blob) {
                    throw new Error('Image conversion failed.');
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                link.href = url;
                link.download = `PDF-Page-${i}.png`;
                link.click();

                setTimeout(() => URL.revokeObjectURL(url), 3000);
            }

            alert('PDF pages converted to images successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to convert PDF to images.');
        }
    };

    fileInput.click();
}
async function pdfToText() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await pdfjsLib.getDocument({
                data: await file.arrayBuffer()
            }).promise;

            let extractedText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();

                const pageText = content.items
                    .map(item => item.str || '')
                    .join(' ');

                extractedText += `\n\n--- Page ${i} ---\n\n`;
                extractedText += pageText;
            }

            if (!extractedText.trim()) {
                alert('No readable text found in this PDF.');
                return;
            }

            const blob = new Blob([extractedText], {
                type: 'text/plain;charset=utf-8'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Extracted-PDF-Text.txt';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('PDF text extracted successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to extract PDF text.');
        }
    };

    fileInput.click();
}
async function compressPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const bytes = await pdf.save({
                useObjectStreams: true,
                addDefaultPage: false
            });

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Compressed-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            const originalSize = (file.size / 1024).toFixed(2);
            const newSize = (bytes.length / 1024).toFixed(2);

            alert(
                `PDF optimization completed!\n` +
                `Original: ${originalSize} KB\n` +
                `New: ${newSize} KB`
            );

        } catch (error) {
            console.error(error);
            alert('Unable to optimize PDF.');
        }
    };

    fileInput.click();
}
async function editDetailsPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            const title = prompt('Enter PDF title:', pdf.getTitle() || '');
            if (title === null) return;

            const author = prompt('Enter author name:', pdf.getAuthor() || '');
            if (author === null) return;

            const subject = prompt('Enter subject:', pdf.getSubject() || '');
            if (subject === null) return;

            const keywords = prompt(
                'Enter keywords (comma separated):',
                pdf.getKeywords().join(', ')
            );
            if (keywords === null) return;

            pdf.setTitle(title);
            pdf.setAuthor(author);
            pdf.setSubject(subject);
            pdf.setKeywords(
                keywords.split(',').map(word => word.trim()).filter(Boolean)
            );

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Edited-Details-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('PDF details updated successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to edit PDF details.');
        }
    };

    fileInput.click();
}
async function removeDetailsPDF() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const pdf = await PDFDocument.load(
                await file.arrayBuffer()
            );

            pdf.setTitle('');
            pdf.setAuthor('');
            pdf.setSubject('');
            pdf.setKeywords([]);
            pdf.setCreator('');
            pdf.setProducer('');

            const bytes = await pdf.save();

            const blob = new Blob([bytes], {
                type: 'application/pdf'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'Details-Removed-PDF.pdf';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert('Common PDF details removed successfully!');

        } catch (error) {
            console.error(error);
            alert('Unable to remove PDF details.');
        }
    };

    fileInput.click();
}
async function comparePDFs() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';
    fileInput.multiple = true;

    fileInput.onchange = async () => {
        const files = Array.from(fileInput.files);

        if (files.length !== 2) {
            alert('Please select exactly two PDF files.');
            return;
        }

        try {
            async function extractText(file) {
                const pdf = await pdfjsLib.getDocument({
                    data: await file.arrayBuffer()
                }).promise;

                const pages = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();

                    pages.push(
                        content.items.map(item => item.str || '').join(' ')
                    );
                }

                return pages;
            }

            const text1 = await extractText(files[0]);
            const text2 = await extractText(files[1]);

            const maxPages = Math.max(text1.length, text2.length);
            let report = 'PDF COMPARISON REPORT\n\n';

            report += `First PDF: ${files[0].name}\n`;
            report += `Second PDF: ${files[1].name}\n\n`;

            let differences = 0;

            for (let i = 0; i < maxPages; i++) {
                const first = text1[i] || '';
                const second = text2[i] || '';

                if (first !== second) {
                    differences++;

                    report += `PAGE ${i + 1}\n`;
                    report += `First PDF: ${first || '[No page]'}\n`;
                    report += `Second PDF: ${second || '[No page]'}\n\n`;
                }
            }

            if (differences === 0) {
                report += 'No text differences found.';
            } else {
                report += `Total pages with differences: ${differences}`;
            }

            const blob = new Blob([report], {
                type: 'text/plain;charset=utf-8'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'PDF-Comparison-Report.txt';
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            alert(
                differences === 0
                    ? 'No text differences found!'
                    : `Comparison completed! Differences found on ${differences} pages.`
            );

        } catch (error) {
            console.error(error);
            alert('Unable to compare PDFs.');
        }
    };

    fileInput.click();
}
// Tool button actions
document.getElementById('tools').addEventListener('click', event => {

  const tool = event.target.dataset.tool ||
    event.target.textContent.trim();

  if (tool === 'Merge') {

    const fileInput = document.createElement('input');

    fileInput.type = 'file';
    fileInput.accept = '.pdf,application/pdf';
    fileInput.multiple = true;

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        mergePDFs(Array.from(fileInput.files));
      }
    });

    fileInput.click();

 } else if (tool === 'Split') {

  splitPDF();

} else if (tool === 'Reorder') {
    reorderPDF();
} else if (tool === 'Rotate') {
    rotatePDF();
} else if (tool === 'Delete Pages') {
    deletePagesPDF();
} else if (tool === 'Duplicate') {
    duplicatePagesPDF();
} else if (tool === 'Extract Pages') {
    extractPagesPDF();
} else if (tool === 'Blank Page') {
    addBlankPagePDF();
} else if (tool === 'Crop') {
    cropPDF();
} else if (tool === 'Add Text') {
    addTextPDF();
} else if (tool === 'Add Image') {
    addImagePDF();
} else if (tool === 'Highlight') {
    highlightPDF();
} else if (tool === 'Draw') {
    drawPDF();
} else if (tool === 'Shapes') {
    addShapesPDF();
} else if (tool === 'Whiteout') {
    whiteoutPDF();
} else if (tool === 'Redact') {
    redactPDF();
} else if (tool === 'Sign') {
    signPDF();
} else if (tool === 'Fill Forms') {
    fillFormsPDF();
} else if (tool === 'Watermark') {
    watermarkPDF();
} else if (tool === 'Page Numbers') {
    addPageNumbersPDF();
} else if (tool === 'Header & Footer') {
    headerFooterPDF();
} else if (tool === 'Date Stamp') {
    dateStampPDF();
} else if (tool === 'Images to PDF') {
    imagesToPDF();
} else if (tool === 'PDF to Images') {
    pdfToImages();
} else if (tool === 'PDF to Text') {
    pdfToText();
} else if (tool === 'Compress') {
    compressPDF();
} else if (tool === 'Edit Details') {
    editDetailsPDF();
} else if (tool === 'Remove Details') {
    removeDetailsPDF();
} else if (tool === 'Compare PDFs') {
    comparePDFs();
} else if (tool) {
    alert(tool + ' feature will be implemented soon!');
}
});