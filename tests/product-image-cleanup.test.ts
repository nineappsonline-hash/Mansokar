import { test } from "node:test";
import assert from "node:assert/strict";
import { processCleanupJob, safeCleanupPath, type CleanupJob } from "../src/lib/product-image-cleanup";

const job: CleanupJob = { id: 1, bucket: "catalog-images", path: "abc123.jpg", lease_token: "lease-a" };
test("validates catalog storage keys and rejects remote URLs",()=>{
  assert.equal(safeCleanupPath("abc123.jpg"),true);
  assert.equal(safeCleanupPath("https://example.com/image.jpg"),false);
  assert.equal(safeCleanupPath("../private.jpg"),false);
});
test("deletes unreferenced image and acknowledges lease",async()=>{
  const actions:string[]=[];
  const result=await processCleanupJob(job,{
    isReferenced:async()=>false,
    remove:async()=>{actions.push("remove");},
    finish:async(_job,success)=>{actions.push(success?"done":"failed");return true;},
  });
  assert.equal(result,"deleted");
  assert.deepEqual(actions,["remove","done"]);
});
test("does not remove a referenced image",async()=>{
  let removed=false;
  const result=await processCleanupJob(job,{
    isReferenced:async()=>true,
    remove:async()=>{removed=true;},
    finish:async()=>true,
  });
  assert.equal(result,"referenced");
  assert.equal(removed,false);
});
test("storage failure remains retryable",async()=>{
  const outcomes:boolean[]=[];
  const result=await processCleanupJob(job,{
    isReferenced:async()=>false,
    remove:async()=>{throw Error("temporary storage failure");},
    finish:async(_job,success)=>{outcomes.push(success);return true;},
  });
  assert.equal(result,"failed");
  assert.deepEqual(outcomes,[false]);
});
test("invalid bucket never triggers storage deletion",async()=>{
  let removed=false;
  const result=await processCleanupJob({...job,bucket:"private"},{
    isReferenced:async()=>false,
    remove:async()=>{removed=true;},
    finish:async()=>true,
  });
  assert.equal(result,"failed");
  assert.equal(removed,false);
});
