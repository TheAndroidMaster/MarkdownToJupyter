#!/usr/bin/env node
'use strict';

const _reader = require("readline"),
	_fs = require("fs"),
	_child = require("child_process");

const _kernels = {
	python: {
		display_name: "Python 3",
		language: "python",
		name: "python3"
	}
};

const _languages = {
	python: {
		codemirror_mode: {
			name: "ipython",
			version: 3
		},
		file_extension: ".py",
		mimetype: "text/x-python",
		name: "python",
		nbconvert_exporter: "python",
		pygments_lexer: "ipython3",
		version: "3.5.2"
	}	
};

let language = "python";

let mdFilePath = process.argv[2];
let outputFilePath = mdFilePath.replace(/(.md)/g, ".ipynb");
if (process.argv[3])
	outputFilePath = process.argv[3];

if (process.argv[4]) {
	language = process.argv[4];
	if (!_languages[language])
		console.error("Invalid language: ",  language);
}

let output = { 
	cells: [],
	metadata: {
		kernelspec: _kernels.python,
		language_info: _languages.python
	},
	nbformat: 4,
	nbformat_minor: 2
};

let commands = [];
let code = false;
let codes = 0;

function addMdCell(commands) {
	output.cells.push({
		cell_type: "markdown",
		metadata: {},
		source: commands	
	});
}

function addCodeCell(commands) {
	const pos = output.cells.length;
	console.log("Executing python in cell " + pos + "...");
	console.log("--------------");
	for (let i = 0; i < commands.length; i++) {
		console.log(">   " + commands[i].substring(0, commands[i].length - 1));
	}

	_fs.writeFileSync(".temp.py", commands.join(""));
	let process = _child.spawnSync("python", [".temp.py"]);

	console.log("--- output ---");
	let out = process.stdout.toString("utf8");
	out = out.substring(out, out.length - 1);
	console.log(out);
	console.log("--------------\n");

	let outarr = out.split("\n");
	for (let i = 0; i < outarr.length; i++) {
		outarr[i] += "\n";
	}

	output.cells.push({
		cell_type: "code",
		execution_count: codes++,
		metadata: {},
		outputs: [{
			name: "stdout",
			output_type: "stream",
			text: outarr		
		}],
		source: commands
	});
}

let content = _fs.readFileSync(mdFilePath, "utf8").split("\n");
for (let i = 0; i < content.length; i++) {
	if (content[i].startsWith("```")) {
		if (code && commands.length > 0) 
			addCodeCell(commands);
		else if (commands.length > 0)
			addMdCell(commands);
		
		commands = [];
		code = !code;
	} else if (!code && content[i].startsWith("#") && commands.length > 0) {
		addMdCell(commands);
		commands = [];
	} else commands.push(content[i] + "\n");
}

if (commands.length > 0) {
	if (code)
		addCodeCell(commands);
	else addMdCell(commands);
}

if (_fs.existsSync(".temp.py"))
	_fs.unlinkSync(".temp.py");

_fs.writeFileSync(outputFilePath, JSON.stringify(output, null, 2));
console.log("Conversion successful! Output file at " + outputFilePath);
