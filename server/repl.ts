import { createRepl, create } from "ts-node"

// based on https://typestrong.org/ts-node/api/index.html#createRepl
const repl = createRepl()
const service = create({ ...repl.evalAwarePartialHost })
repl.setService(service)
repl.start()

// load actions in as $
repl.evalCode("import * as $ from './model'\n")
