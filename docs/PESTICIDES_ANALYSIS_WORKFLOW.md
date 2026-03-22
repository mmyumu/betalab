# Technical Specification: Pesticide Analysis Workflow (Chromatography)

## 1. Overview
This document defines the standard operating procedure for the detection of pesticide residues in fruit samples (specifically apples) using chromatographic analysis. This process describes the sequence from sample reception to quantitative data validation.

## 2. Process Workflow
The workflow is divided into four primary modules: **Preparation**, **Extraction (QuEChERS)**, **Cleanup**, and **Chromatographic Analysis**.

---

## 3. Detailed Operational Steps

### 3.1. Reception & Sampling
* **Sample ID Assignment:** Every incoming sample must be registered with a unique tracking code (barcode).
* **Homogenization:** * The entire unit (e.g., the whole apple) is processed to ensure representativeness.
    * **Action:** Mechanical grinding with solid CO2 (dry ice) to prevent thermal degradation of volatile residues.
    * **Result:** Cryogenic homogenized powder.

### 3.2. Extraction (QuEChERS Method)
Standardized extraction protocol (*Quick, Easy, Cheap, Effective, Rugged, and Safe*):
* **Weighing:** Exact measurement of **10g** of homogenized sample into a 50mL centrifuge tube.
* **Solvent Addition:** Addition of 10mL of acetonitrile.
* **Phase Partitioning:** Addition of buffering salts ($MgSO_4$, $NaCl$) to promote phase separation.
* **Agitation & Centrifugation:** * Mechanical shaking (1 minute).
    * Centrifugation at 5,000 RPM to separate the organic solvent phase (containing pesticides) from the sample matrix.

### 3.3. Cleanup
To protect the chromatographic column from matrix interference (sugars, lipids, pigments):
* **Dispersion:** Transfer supernatant to a secondary tube containing Dispersive Solid Phase Extraction (d-SPE) sorbents (e.g., PSA).
* **Final Centrifugation:** High-speed centrifugation to produce a clear extract ready for injection.

### 3.4. Analysis & Quantification (LC-MS/MS)
* **Injection:** Automated injection of 2–5 microliters of the final extract into the LC-MS/MS system.
* **Separation:** Molecules are separated based on retention time through a chromatography column.
* **Mass Spectrometry:** Detection of pesticides via fragmentation patterns compared against a reference library.

---

## 4. Validation Logic
The system must support the following validation criteria:
1.  **Identification:** A detected peak must match the library's **Retention Time** and **Mass-to-Charge Ratio** ($m/z$) for the target analyte.