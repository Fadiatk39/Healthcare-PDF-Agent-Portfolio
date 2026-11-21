// Healthcare PDF Agent
// Developed by Fadia Hassan Mohammed

// PDF.js Configuration

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


// HTML Elements

const pdfInput = document.getElementById("pdfInput");
const uploadArea = document.getElementById("uploadArea");
const fileDetails = document.getElementById("fileDetails");

const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");

const removeFileButton = document.getElementById("removeFile");
const analyzeButton = document.getElementById("analyzeButton");

const analysisType = document.getElementById("analysisType");

const statusMessage = document.getElementById("statusMessage");

const resultsSection = document.getElementById("resultsSection");
const resultsContent = document.getElementById("resultsContent");

const copyResultsButton = document.getElementById("copyResults");


// Variables

let selectedFile = null;
let extractedText = "";


// Format File Size

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// Select PDF File

pdfInput.addEventListener("change", function () {

    const file = pdfInput.files[0];

    if (!file) {
        return;
    }

    if (file.type !== "application/pdf") {
        alert("الرجاء اختيار ملف PDF صالح.");
        pdfInput.value = "";
        return;
    }

    selectedFile = file;

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    fileDetails.hidden = false;

    analyzeButton.disabled = false;

    statusMessage.textContent =
        "تم اختيار الملف بنجاح. يمكنك الآن بدء التحليل.";

    resultsSection.hidden = true;
    extractedText = "";

});


// Remove Selected File

removeFileButton.addEventListener("click", function () {

    selectedFile = null;
    extractedText = "";

    pdfInput.value = "";

    fileDetails.hidden = true;

    analyzeButton.disabled = true;

    resultsSection.hidden = true;

    statusMessage.textContent =
        "اختاري ملف PDF للبدء.";

});


// Read PDF File

async function readPDF(file) {

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer)
    }).promise;

    let fullText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

        const page = await pdf.getPage(pageNumber);

        const textContent = await page.getTextContent();

        const pageText = textContent.items
            .map(item => item.str)
            .join(" ");

        fullText +=
            "\n\n--- الصفحة " + pageNumber + " ---\n\n" +
            pageText;
    }

    return {
        text: fullText.trim(),
        pages: pdf.numPages
    };

}


// Generate Simple Summary

function generateSummary(text) {

    const sentences = text
        .replace(/\s+/g, " ")
        .split(/[.!؟?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 25);

    if (sentences.length === 0) {
        return "لم نتمكن من العثور على جمل واضحة لتلخيصها.";
    }

    const summary = sentences.slice(0, 5);

    return summary
        .map((sentence, index) => {
            return (index + 1) + ". " + sentence;
        })
        .join("\n\n");

}


// Extract Important Keywords

function extractKeywords(text) {

    const stopWords = new Set([
        "في", "من", "على", "إلى", "عن",
        "هذا", "هذه", "ذلك", "تلك",
        "التي", "الذي", "مع", "كان",
        "كانت", "هو", "هي", "أن", "إن",
        "ما", "لا", "لم", "لن", "قد",
        "تم", "ثم", "بين", "عند",
        "the", "and", "for", "with",
        "from", "this", "that", "are",
        "was", "were", "has", "have"
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(word =>
            word.length > 3 &&
            !stopWords.has(word) &&
            !/^\d+$/.test(word)
        );

    const frequency = {};

    words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
    });

    const sortedWords = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    if (sortedWords.length === 0) {
        return "لم يتم العثور على كلمات مهمة.";
    }

    return sortedWords
        .map((item, index) => {
            return (index + 1) + ". " + item[0] +
                " — تكررت " + item[1] + " مرة";
        })
        .join("\n");

}


// Display Results

function displayResults(content, title) {

    resultsContent.textContent =
        title + "\n\n" + content;

    resultsSection.hidden = false;

    resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// Analyze PDF

analyzeButton.addEventListener("click", async function () {

    if (!selectedFile) {
        alert("الرجاء اختيار ملف PDF أولاً.");
        return;
    }

    analyzeButton.disabled = true;

    analyzeButton.textContent = "جاري تحليل الملف...";

    statusMessage.textContent =
        "يتم الآن قراءة صفحات المستند واستخراج النصوص...";

    resultsSection.hidden = true;

    try {

        const result = await readPDF(selectedFile);

        extractedText = result.text;

        if (!extractedText) {

            throw new Error(
                "لم يتم العثور على نص قابل للاستخراج داخل الملف."
            );

        }

        const selectedAnalysis = analysisType.value;

        if (selectedAnalysis === "summary") {

            const summary = generateSummary(extractedText);

            displayResults(
                "ملخص محتوى المستند:\n\n" +
                summary +
                "\n\nعدد الصفحات: " + result.pages,
                "نتيجة تلخيص المستند"
            );

        }

        else if (selectedAnalysis === "extract") {

            displayResults(
                extractedText +
                "\n\nعدد الصفحات: " + result.pages,
                "النص المستخرج من المستند"
            );

        }

        else if (selectedAnalysis === "keywords") {

            const keywords = extractKeywords(extractedText);

            displayResults(
                "أهم الكلمات والمصطلحات:\n\n" +
                keywords +
                "\n\nعدد الصفحات: " + result.pages,
                "نتيجة استخراج الكلمات المهمة"
            );

        }

        statusMessage.textContent =
            "اكتمل استخراج النص وتحليل المستند بنجاح.";

    }

    catch (error) {

        console.error("PDF Analysis Error:", error);

        statusMessage.textContent =
            "حدثت مشكلة أثناء قراءة الملف.";

        alert(
            "تعذر تحليل الملف. تأكدي أنه ملف PDF يحتوي على نص قابل للاستخراج."
        );

    }

    finally {

        analyzeButton.disabled = false;

        analyzeButton.innerHTML =
            "<span>✦</span> ابدأ التحليل";

    }

});


// Copy Results

copyResultsButton.addEventListener("click", async function () {

    const text = resultsContent.innerText;

    if (!text.trim()) {
        return;
    }

    try {

        await navigator.clipboard.writeText(text);

        copyResultsButton.textContent = "تم النسخ ✓";

        setTimeout(function () {
            copyResultsButton.textContent = "نسخ النتائج";
        }, 2000);

    }

    catch (error) {

        alert("تعذر النسخ تلقائيًا. يمكنك تحديد النص ونسخه يدويًا.");

    }

});


// Console Message

console.log(
    "Healthcare PDF Agent is ready!"
);