import assert from "node:assert/strict";
import { test } from "node:test";
import { webVitalInput, metricValue } from "../src/lib/web-vitals";

const valid = {
  name:"LCP", value:1640, rating:"good", page:"home", device:"mobile", locale:"ar",
};
test("Web Vitals accept only anonymous coarse field metrics", () => {
  assert.equal(webVitalInput.safeParse(valid).success, true);
  assert.equal(webVitalInput.safeParse({...valid, name:"INP",value:140}).success,true);
  assert.equal(webVitalInput.safeParse({...valid, name:"CLS",value:0.1}).success,true);
  assert.equal(webVitalInput.safeParse({...valid,userId:"1"}).success,false);
  assert.equal(webVitalInput.safeParse({...valid,url:"/ar/products/sensitive"}).success,false);
  assert.equal(webVitalInput.safeParse({...valid,name:"purchase"}).success,false);
  assert.equal(webVitalInput.safeParse({...valid,value:Infinity}).success,false);
  assert.equal(webVitalInput.safeParse({...valid,value:-1}).success,false);
  assert.equal(webVitalInput.safeParse({...valid,page:"checkout/secret"}).success,false);
});
test("Field vitals preserve LCP milliseconds and CLS fractions", () => {
  assert.equal(metricValue("LCP", 1654.366), 1654);
  assert.equal(metricValue("CLS", 0.0934999), 0.093);
});
