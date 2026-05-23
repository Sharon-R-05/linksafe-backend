import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import { execSync } from 'child_process';

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '50mb' }));

// Try to find Chrome
let chromePath = null;
try {
    const paths = [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        process.env.PUPPETEER_EXECUTABLE_PATH
    ];
    
    for (const p of paths) {
        if (p && execSync(`test -f ${p} && echo "exists"`, { stdio: 'pipe' }).toString().trim() === 'exists') {
            chromePath = p;
            console.log(`✅ Found Chrome at: ${chromePath}`);
            break;
        }
    }
} catch(e) {
    console.log('⚠️ Chrome not found in system paths');
}

const browserArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
];

app.post("/fetch-screen", async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    console.log(`📸 Capturing: ${url}`);

    let browser;
    try {
        const launchOptions = {
            headless: true,
            args: browserArgs
        };
        
        if (chromePath) {
            launchOptions.executablePath = chromePath;
        }
        
        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
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
