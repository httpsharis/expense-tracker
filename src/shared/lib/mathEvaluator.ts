/**
 * Clean, safe math evaluator for inline calculator expressions.
 * Respects standard operator precedence (* and / before + and -).
 */
export function evaluateExpression(expression: string): number {
  const sanitized = expression.replace(/×/g, "*").replace(/÷/g, "/").trim();
  const clean = sanitized.replace(/[+\-*/]+$/, "").trim();
  if (!clean) return 0;

  const tokens = clean.match(/(\d+(\.\d+)?|[+\-*/])/g);
  if (!tokens || tokens.length === 0) return 0;

  // Pass 1: Multiplication and Division
  const intermediate: (number | string)[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === "*" || token === "/") {
      const prev = intermediate.pop();
      const next = parseFloat(tokens[i + 1]);
      if (typeof prev === "number" && !isNaN(next)) {
        const val = token === "*" ? prev * next : next !== 0 ? prev / next : 0;
        intermediate.push(val);
        i += 2;
        continue;
      }
    }
    const num = parseFloat(token);
    intermediate.push(isNaN(num) ? token : num);
    i++;
  }

  // Pass 2: Addition and Subtraction
  let total =
    typeof intermediate[0] === "number" ? (intermediate[0] as number) : 0;
  let j = 1;
  while (j < intermediate.length) {
    const op = intermediate[j];
    const nextVal = intermediate[j + 1];
    if (typeof nextVal === "number") {
      if (op === "+") total += nextVal;
      else if (op === "-") total -= nextVal;
    }
    j += 2;
  }

  return Math.max(0, Math.round(total * 100) / 100);
}

