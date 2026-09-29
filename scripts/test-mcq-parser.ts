import { parseQuestionsFromText } from "../server/pdf-questions";

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FAIL:", name);
    process.exitCode = 1;
  } else console.log("OK:", name);
}

const cases = [
  {
    name: "typed options + Answer B",
    text: `1. What is 2+2?\nA) 3\nB) 4\nC) 5\nD) 6\nAnswer: B`,
    check: (q: ReturnType<typeof parseQuestionsFromText>) => {
      assert("one q", q.length === 1);
      assert("4 opts", (q[0].options?.length ?? 0) === 4);
      assert("correct B", q[0].correctOption === 1);
    },
  },
  {
    name: "inline options",
    text: `1. Pick: A) 3  B) 4  C) 5\nAnswer: B`,
    check: (q: ReturnType<typeof parseQuestionsFromText>) => {
      assert("inline", (q[0]?.options?.length ?? 0) >= 2);
    },
  },
  {
    name: "Option 1 check marker",
    text: `1. Prime?\nOption 1: 4\nOption 2: 7 ✔ Correct\nOption 3: 9`,
    check: (q: ReturnType<typeof parseQuestionsFromText>) => {
      assert("options", (q[0]?.options?.length ?? 0) >= 2);
    },
  },
  {
    name: "dollar in text",
    text: `1. Cost is $5?\nA) $3\nB) $5\nAnswer: B`,
    check: (q: ReturnType<typeof parseQuestionsFromText>) => {
      assert("dollar kept", q[0]?.text.includes("$5") || q[0]?.options?.some((o) => o.includes("$")));
    },
  },
  {
    name: "theory unchanged",
    text: `1. Explain gravity.\nModel Answer: Force of attraction.`,
    check: (q: ReturnType<typeof parseQuestionsFromText>) => {
      assert("no mcq opts", !q[0]?.options || q[0].options!.length < 2);
      assert("model answer", !!q[0]?.modelAnswer);
    },
  },
];

for (const c of cases) {
  c.check(parseQuestionsFromText(c.text));
}
console.log("Done.");
