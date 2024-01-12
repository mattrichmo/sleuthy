import React, { useState, useEffect } from 'react';
import { render, Box, Text, Spinner } from 'ink';


import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

let urlsToScrape = ['https://creativebc.com'];

const cleanUrl = (url) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `http://${url}`;
    }
    return url;
};

const isInternalLink = (url, rootDomain) => {
    return url.includes(rootDomain);
};

const extractEmails = (text) => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    return text.match(emailRegex) || [];
};

const extractLinks = ($) => {
    const links = [];
    $('a').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
            links.push(href);
        }
    });
    return links;
};

const scrapePage = async (url, rootDomain) => {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const internalLinks = [];
        const externalLinks = [];
        const emails = extractEmails(response.data);

        extractLinks($).forEach(href => {
            const cleanedHref = cleanUrl(href);
            if (isInternalLink(cleanedHref, rootDomain)) {
                internalLinks.push(cleanedHref);
            } else {
                externalLinks.push(cleanedHref);
            }
        });

        console.log(`Scraped internal page: ${url}`); // Log each internal page being scraped

        return {
            url,
            internalLinks,
            externalLinks,
            emails,
        };
    } catch (error) {
        console.error(`Error scraping ${url}: ${error}`);
        return null;
    }
};

const scrapeAllPages = async (rootUrl) => {
    const rootDomain = new URL(rootUrl).hostname;
    let pagesToScrape = [rootUrl];
    let scrapedPages = [];

    while (pagesToScrape.length) {
        const currentUrl = pagesToScrape.pop();
        if (!scrapedPages.includes(currentUrl)) {
            const pageData = await scrapePage(currentUrl, rootDomain);
            if (pageData) {
                scrapedPages.push(pageData);
                pageData.internalLinks.forEach(link => {
                    if (!pagesToScrape.includes(link) && !scrapedPages.some(page => page.url === link)) {
                        pagesToScrape.push(link);
                    }
                });
            }
        }
    }

    return scrapedPages;
};

const scrapeAllDomains = async (urlsToScrape) => {
    let allScrapedData = [];
    for (const url of urlsToScrape) {
        const scrapedData = await scrapeAllPages(url);
        allScrapedData = allScrapedData.concat(scrapedData);
    }
    return allScrapedData;
};

const ScrapeDashboard = () => {
    const [currentUrl, setCurrentUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [scrapedData, setScrapedData] = useState([]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            for (const url of urlsToScrape) {
                setCurrentUrl(url);
                const data = await scrapeAllPages(url);
                setScrapedData(prevData => [...prevData, ...data]);
            }
            setLoading(false);
        })();
    }, []);

    return (
        <Box flexDirection="column">
            <Box>
                <Text color="green">Scraping URL:</Text> <Text>{currentUrl || 'None'}</Text>
            </Box>
            {loading ? (
                <Box>
                    <Spinner type="dots" />
                    <Text> Scraping...</Text>
                </Box>
            ) : (
                <Box>
                    {/* Display scraped data or other information here */}
                    <Text>Data scraped from {scrapedData.length} pages</Text>
                </Box>
            )}
        </Box>
    );
};

render(<ScrapeDashboard />);



