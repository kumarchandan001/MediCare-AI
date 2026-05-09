# Healthcare AI Dataset Architecture Reorganization Report

The datasets have been successfully reorganized into a clean, scalable AI architecture. Below is the summary of the files moved and their detected purposes based on names/content.

| Original Location | New Location | Detected Dataset Purpose |
|-------------------|--------------|--------------------------|
| `data/train_disease.csv` | `data/prediction/train_disease.csv` | Disease Prediction (CatBoost/LightGBM) |
| `data/test_disease.csv` | `data/prediction/test_disease.csv` | Disease Prediction (CatBoost/LightGBM) |
| `data/Training.csv` | `data/prediction/Training.csv` | Disease Prediction (CatBoost/LightGBM) |
| `data/Testing.csv` | `data/prediction/Testing.csv` | Disease Prediction (CatBoost/LightGBM) |
| `data/Disease_Symptom_Dataset.csv` | `data/prediction/Disease_Symptom_Dataset.csv` | Disease Prediction (CatBoost/LightGBM) |
| `data/Symptom2Disease.csv` | `data/nlp/Symptom2Disease.csv` | NLP Symptom Mapping |
| `data/symptom_Description.csv` | `data/knowledge/symptom_Description.csv` | Disease Descriptions & Precautions |
| `data/symptom_precaution.csv` | `data/knowledge/symptom_precaution.csv` | Disease Descriptions & Precautions |
| `data/Symptom-severity.csv` | `data/severity/Symptom-severity.csv` | Symptom Severity Scoring |
| `who_data/Adult mortality rate.csv` | `data/knowledge/who_guidelines/Adult mortality rate.csv` | WHO Guidelines & Statistics |
| `who_data/Air pollution death rate.csv` | `data/knowledge/who_guidelines/Air pollution death rate.csv` | WHO Guidelines & Statistics |
| `who_data/Alcohol consumption.csv` | `data/knowledge/who_guidelines/Alcohol consumption.csv` | WHO Guidelines & Statistics |
| `who_data/Cardiovascular disease mortality.csv` | `data/knowledge/who_guidelines/Cardiovascular disease mortality.csv` | WHO Guidelines & Statistics |
| `who_data/Child mortality rate.csv` | `data/knowledge/who_guidelines/Child mortality rate.csv` | WHO Guidelines & Statistics |
| `who_data/Chronic respiratory disease mortality.csv` | `data/knowledge/who_guidelines/Chronic respiratory disease mortality.csv` | WHO Guidelines & Statistics |
| `who_data/Diabetes prevalence (%).csv` | `data/knowledge/who_guidelines/Diabetes prevalence (%).csv` | WHO Guidelines & Statistics |
| `who_data/Hepatitis prevalence.csv` | `data/knowledge/who_guidelines/Hepatitis prevalence.csv` | WHO Guidelines & Statistics |
| `who_data/HIV infections new.csv` | `data/knowledge/who_guidelines/HIV infections new.csv` | WHO Guidelines & Statistics |
| `who_data/HIV infections total.csv` | `data/knowledge/who_guidelines/HIV infections total.csv` | WHO Guidelines & Statistics |
| `who_data/HIV prevalence.csv` | `data/knowledge/who_guidelines/HIV prevalence.csv` | WHO Guidelines & Statistics |
| `who_data/Hypertension prevalence.csv` | `data/knowledge/who_guidelines/Hypertension prevalence.csv` | WHO Guidelines & Statistics |
| `who_data/Infectious disease prevalence by region.csv` | `data/knowledge/who_guidelines/Infectious disease prevalence by region.csv` | WHO Guidelines & Statistics |
| `who_data/Life expectancy.csv` | `data/knowledge/who_guidelines/Life expectancy.csv` | WHO Guidelines & Statistics |
| `who_data/Malaria incidence.csv` | `data/knowledge/who_guidelines/Malaria incidence.csv` | WHO Guidelines & Statistics |
| `who_data/Malaria mortality rate.csv` | `data/knowledge/who_guidelines/Malaria mortality rate.csv` | WHO Guidelines & Statistics |
| `who_data/Road traffic deaths.csv` | `data/knowledge/who_guidelines/Road traffic deaths.csv` | WHO Guidelines & Statistics |
| `who_data/Tobacco use prevalence.csv` | `data/knowledge/who_guidelines/Tobacco use prevalence.csv` | WHO Guidelines & Statistics |
| `who_data/Tuberculosis (TB) incidence.csv` | `data/knowledge/who_guidelines/Tuberculosis (TB) incidence.csv` | WHO Guidelines & Statistics |
