import { writeFile } from 'fs';
import { useTypesStore } from "@/stores/typesStore";

function exportTemplatesToJson() {
  const templates = useTypesStore.getState().templates;
  const jsonContent = JSON.stringify(templates, null, 2); // Pretty print with 2 spaces

  writeFile('templates.json', jsonContent, 'utf8', (err) => {
    if (err) {
      console.error("An error occurred while writing JSON Object to File.", err);
    } else {
      console.log("JSON file has been saved.");
    }
  });
}

exportTemplatesToJson();