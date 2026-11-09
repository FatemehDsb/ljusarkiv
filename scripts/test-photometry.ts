import fs from "node:fs";
import { parsePhotometry } from "../lib/photometry";
for (const f of ["samples/test_downlight.ldt", "samples/test_downlight.ies"]) {
  const r = parsePhotometry(f, fs.readFileSync(f));
  console.log(f, JSON.stringify(r));
}
