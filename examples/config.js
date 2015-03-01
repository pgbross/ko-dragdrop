System.config({
  "baseURL": "/examples",
  "transpiler": "babel",
  "paths": {
    "*": "*.js",
    "github:*": "jspm_packages/github/*.js",
    "npm:*": "jspm_packages/npm/*.js"
  }
});

System.config({
  "map": {
    "ko-dragdrop":"../dist/ko-dragdrop",
    "knockout": "npm:knockout@3.3.0",
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.0"
    },
    "npm:knockout@3.3.0": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});
