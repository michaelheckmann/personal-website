import * as fs from "fs";

type ValeAlert = {
  Line: number;
  Message: string;
};

type ValeOutput = Record<string, ValeAlert[]>;

const checkIfValeInstalled = (): boolean => {
  try {
    const { stdout } = Bun.spawnSync(["vale", "--version"]);
    return stdout.toString().length > 0;
  } catch {
    return false;
  }
};

const runValeOnPath = (blogPostName: string): void => {
  // Check if --pretty flag is present
  const isPrettyOutput: boolean = process.argv.includes("--pretty");

  if (!checkIfValeInstalled()) {
    console.log("Vale is not installed.");
    return;
  }
  const targetPath = `src/content/blog/en/${blogPostName}.md`;
  if (!fs.existsSync(targetPath)) {
    console.log(`File ${targetPath} does not exist.`);
    return;
  }

  const { stdout } = Bun.spawnSync(["vale", "--output=JSON", targetPath]);
  const results = JSON.parse(stdout.toString()) as ValeOutput;

  const analysis: string[] = [];
  Object.entries(results).forEach(([filePath, alerts]: [string, any]) => {
    const fileContent = fs.readFileSync(filePath, "utf8").split("\n");
    const linesMap: Record<number, string[]> = {};

    alerts.forEach((alert: any) => {
      const lineIndex = alert.Line - 1;
      if (!linesMap[lineIndex]) {
        linesMap[lineIndex] = [];
      }
      linesMap[lineIndex].push(alert.Message);
    });

    let editCounter = 1;
    Object.entries(linesMap).forEach(([lineNumber, messages]) => {
      const lineIndex = Number(lineNumber);
      const lineContent = fileContent[lineIndex];
      if (isPrettyOutput) {
        analysis.push(`### Edit ${editCounter}`);
        analysis.push(lineContent);
        analysis.push("");
        analysis.push(`**Suggestions**`);
        messages.forEach((message: string) => {
          analysis.push(`- ${message}`);
        });
        analysis.push("");
        editCounter++;
      } else {
        analysis.push(`${lineIndex + 1}: ${lineContent}`);
        messages.forEach((message: string) => {
          analysis.push(message);
        });
        analysis.push("");
      }
    });
  });

  fs.writeFileSync("vale-analysis.md", analysis.join("\n"));
};

if (process.argv.length < 3) {
  console.log("Please provide the name of a blog post.");
  process.exit(1);
}

runValeOnPath(process.argv[2]);
