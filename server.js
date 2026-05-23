import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '50mb' }));

// Use Chromium from system path or let puppeteer find it
const browserArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process'
];

app.post("/fetch-screen", async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    console.log(`📸 Capturing: ${url}`);

    let browser;
    try {
        // Launch with specific arguments for Render
        browser = await puppeteer.launch({
            headless: true,
            args: browserArgs,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });
        
        const screenshot = await page.screenshot({ encoding: "base64" });
        await browser.close();

        res.setHeader('Content-Type', 'text/plain');
        res.send(`data:image/png;base64,${screenshot}`);
        
    } catch (error) {
        if (browser) await browser.close();
        console.error(`Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
