import assert from "node:assert/strict";
import {test} from "node:test";
import {publishAutonomy,AUTONOMY_ALLOWED} from "../scripts/autonomy-publish.mjs";
import {WRITABLE_SOURCE} from "../lib/source-policy";
test("legacy direct main publication is disabled by the new independent-review policy",async()=>{
 assert.deepEqual(AUTONOMY_ALLOWED,WRITABLE_SOURCE);await assert.rejects(publishAutonomy(),/independent approval/);
});
