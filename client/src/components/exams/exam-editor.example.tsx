import { useState } from "react";
import ExamEditor from "./exam-editor";

export default function ExamEditorExample() {
  const [open, setOpen] = useState(true);

  return (
    <ExamEditor
      open={open}
      onOpenChange={setOpen}
      courses={[{ id: 1, title: "Web Development Fundamentals" }]}
      batches={[
        { id: 1, name: "Batch A", courseId: 1, batchCode: "WEB-A" },
        { id: 2, name: "Batch B", courseId: 1, batchCode: "WEB-B" },
      ]}
      exam={{
        id: 0,
        title: "Sample Exam",
        description: "Example of the exam editor form.",
        courseId: 1,
        batchId: 1,
        duration: 60,
        acceptingResponses: true,
        examType: "theory",
      }}
    />
  );
}
