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

const runValeOnPath = (targetPath: string): void => {
  if (!checkIfValeInstalled()) {
    console.log("Vale is not installed.");
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

    Object.entries(linesMap).forEach(([lineNumber, messages]) => {
      const lineContent = fileContent[Number(lineNumber)];
      analysis.push(`${Number(lineNumber) + 1}: ${lineContent}`);
      messages.forEach((m) => analysis.push(m));
      analysis.push("");
    });
  });

  fs.writeFileSync("vale-analysis.md", analysis.join("\n"));
};

if (process.argv.length < 3) {
  console.log("Please provide a file path.");
  process.exit(1);
}

runValeOnPath(process.argv[2]);
