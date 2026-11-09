import { describe, expect, it } from "vitest";
import { aiTopics } from "./ai-topics";
import { classifyJob } from "./job-classifier";
import { aiQueryTopic } from "@/lib/ai-topics";

describe("thèmes IA complémentaires", () => {
  it("retrouve l'IA hybride sans modifier le métier principal", () => {
    const title = "STAGE - Application des LLMs à l'automatisation de tests logiciels";
    const body = "Vos missions\nDévelopper les tests logiciels et tester des LLMs avec RAG.";
    expect(classifyJob(title, body).specialty).toBe("SOFTWARE");
    expect(aiTopics(title, body)).toEqual(expect.arrayContaining(["AI_ML", "AI_LLM"]));
  });
  it("ne confond pas un poste BI avec un sujet de machine learning", () => {
    expect(aiTopics("Stage Power BI", "Vos missions\nConstruire les tableaux de bord financiers.")).toEqual(["DATA_BI"]);
  });
  it("ignore le catalogue technologique de la présentation de l'employeur", () => {
    expect(aiTopics("Stage ingénieur logiciel", "Notre groupe investit en IA, LLM et machine learning.\nVos missions\nMaintenir les logiciels C++.\nVotre profil\nConnaître Python.")).toEqual([]);
  });
  it("écarte le stage juridique d'un employeur IA et lit les sections anglaises", () => {
    expect(classifyJob("IP & Licensing - Intern", "Mistral builds artificial intelligence.\nAbout the role\nHandle licensing contracts and intellectual property.").universe).toBe("OTHER");
    expect(aiTopics("Software Intern", "We build artificial intelligence with LLMs.\nAbout the role\nMaintain C++ drivers.\nBenefits\nJoin our team.")).toEqual([]);
  });
  it.each([
    ["Stage vision par ordinateur", "AI_VISION"], ["Stage NLP", "AI_NLP"],
    ["Software Engineer MLOps - Intern", "AI_MLOPS"], ["Stage IA embarquée", "AI_EMBEDDED"],
    ["Stage apprentissage neuronal", "AI_ML"],
  ])("reconnaît %s", (title, topic) => expect(aiTopics(title)).toContain(topic));
  it("ne prend pas les AI Engines du SoC AMD pour une mission IA", () => {
    expect(aiTopics("Stage programmation des AI Engines du SoC AMD")).not.toContain("AI_ML");
  });
  it("étend les requêtes FR/EN uniquement lorsque le sujet entier est reconnu", () => {
    expect(aiQueryTopic("AI")).toBe("AI_ML"); expect(aiQueryTopic("LLM")).toBe("AI_LLM");
    expect(aiQueryTopic("commercial assurance")).toBeNull();
    expect(aiQueryTopic("Airbus")).toBeNull();
  });
});
