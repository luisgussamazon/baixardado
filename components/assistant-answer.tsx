"use client";
import SafeMarkdown from "./safe-markdown";
import {assistantPresentation} from "../lib/answer-presentation";
export default function AssistantAnswer({children}:{children:string}){
  const answer=assistantPresentation(children);
  return <><SafeMarkdown>{answer.text}</SafeMarkdown>{answer.sources&&<details className="answer-sources"><summary>Fontes</summary><SafeMarkdown>{answer.sources}</SafeMarkdown></details>}</>;
}
