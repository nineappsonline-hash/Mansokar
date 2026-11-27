/**
 * Read-only repeatable LCP attribution for public storefront.
 * Browser contexts are cold; do not submit forms, auth or payment.
 * Run: PERF_BASE_URL=https://mopc.store node scripts/audit-lcp-attribution.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const origin = process.env.PERF_BASE_URL || "https://mopc.store";
const reportFile = process.env.PERF_LCP_REPORT || "reports/lcp-attribution.json";
const url = new URL("/ar", origin).toString();
const browser = await chromium.launch({ headless: true });
const rows = [];
try {
  for (const [device, sampleCount, viewport, scale, isMobile] of [
    ["mobile", 7, {width:390,height:844}, 2, true],
    ["desktop", 4, {width:1365,height:900}, 1, false],
  ]) {
    for (let trial=1;trial<=sampleCount;trial++) {
      const ctx = await browser.newContext({viewport,deviceScaleFactor:scale,isMobile,hasTouch:isMobile,serviceWorkers:"block",locale:"ar-EG"});
      const page=await ctx.newPage();
      const errors=[];
      page.on("pageerror",e=>errors.push("js: "+e.message));
      page.on("response",r=>{if(r.status()>=400 && !r.url().includes("_rsc")) errors.push(r.status()+" "+r.url())});
      await page.addInitScript(() => {
        window.__lcpEntries=[];
        new PerformanceObserver(list=>{
          for(const e of list.getEntries()) {
            const el=e.element;
            window.__lcpEntries.push({
              startTime:e.startTime,renderTime:e.renderTime,loadTime:e.loadTime,
              url:e.url || "",size:e.size,id:e.id || "",
              tag:el?.tagName || "",text:el?.textContent?.trim()?.slice(0,110) || "",
              className:typeof el?.className==="string"?el.className.slice(0,160):"",
              src:el?.getAttribute?.("src") || "",
              bounds:el ? (() => {const x=el.getBoundingClientRect();return [Math.round(x.x),Math.round(x.y),Math.round(x.width),Math.round(x.height)]})() : null,
            });
          }
        }).observe({type:"largest-contentful-paint",buffered:true});
      });
      const started=Date.now();
      let response;
      try { response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:40000}); }
      catch(e){errors.push("navigation: "+String(e));}
      await page.waitForTimeout(2100);
      const data=await page.evaluate(()=>{
        const nav=performance.getEntriesByType("navigation")[0];
        const resources=performance.getEntriesByType("resource");
        const fastest=resources.filter(x=>/\.(woff2?|ttf)(\?|$)/.test(x.name)).map(x=>({name:x.name.split("/").pop(),start:Math.round(x.startTime),end:Math.round(x.responseEnd),bytes:x.transferSize}));
        const top=resources.filter(x=>/\/_next\/static\/.+\.(js|css)|\/_next\/image/.test(x.name)).map(x=>({name:x.name.replace(location.origin,"").slice(0,170),start:Math.round(x.startTime),end:Math.round(x.responseEnd),duration:Math.round(x.duration),bytes:x.transferSize})).sort((a,b)=>b.duration-a.duration).slice(0,12);
        return {
          lcpEntries:window.__lcpEntries,fonts:fastest,
          fontStatus:document.fonts.status,
          fontFaces:[...document.fonts].filter(f=>f.status==="loaded").map(f=>({family:f.family,weight:f.weight})),
          fcp:performance.getEntriesByType("paint").find(x=>x.name==="first-contentful-paint")?.startTime,
          documentEnd:nav?.responseEnd,documentResponseStart:nav?.responseStart,
          domContentLoaded:nav?.domContentLoadedEventEnd,
          largestResources:top,
          heroStyles:(()=>{const h=document.querySelector(".cyan-hero h1");return h?{font:getComputedStyle(h).fontFamily,weight:getComputedStyle(h).fontWeight,visibility:getComputedStyle(h).visibility,opacity:getComputedStyle(h).opacity}:null})(),
        };
      }).catch(e=>({error:String(e)}));
      const row={device,trial,status:response?.status()??0,elapsedMs:Date.now()-started,errors,...data};
      rows.push(row);
      console.log("LCP-SAMPLE",JSON.stringify({
        device,trial,status:row.status,
        lcp:Math.round(row.lcpEntries?.at(-1)?.startTime||0),
        fcp:Math.round(row.fcp||0),documentEnd:Math.round(row.documentEnd||0),
        lcpElement:row.lcpEntries?.at(-1),
        fontRequests:row.fonts?.length,fonts:row.fonts?.map(x=>x.name),
        errors:row.errors,
      }));
      await ctx.close();
    }
  }
} finally {await browser.close()}
mkdirSync("reports",{recursive:true});
writeFileSync(reportFile,JSON.stringify({measuredAt:new Date().toISOString(),url,rows},null,2));
console.log("LCP-REPORT",reportFile);
if(rows.some(x=>x.status!==200||x.errors?.length))process.exitCode=1;
