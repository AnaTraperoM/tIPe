import type { Patent, CitationGraph } from "./types";

// ─── Colour palette ──────────────────────────────────────────────────────────
// L2 subcategory → hex colour (used for dot / chip rendering)
// Gradient from #ffd89b (warm gold) → #19547b (deep teal)
export const CATEGORY_COLORS: Record<string, string> = {
  "Natural Language Processing": "#ffd89b",
  "Computer Vision":             "#f4d093",
  "Reinforcement Learning":      "#e9c88b",
  "AI Hardware & Chips":         "#dec083",
  "Gene Editing":                "#d3b87b",
  "Drug Discovery":              "#c8b073",
  "Synthetic Biology":           "#bda86b",
  "Diagnostics & Imaging":       "#b2a063",
  "Memory & Storage":            "#a7985b",
  "Processor Architecture":      "#9c9053",
  "Advanced Packaging":          "#91884b",
  "Photonics & Optics":          "#868043",
  "Autonomous Vehicles":         "#7b783b",
  "Industrial Automation":       "#707033",
  "Drone Technology":            "#65682b",
  "Humanoid Robots":             "#5a6023",
  "5G & 6G Networks":            "#4f581b",
  "Satellite Communication":     "#475220",
  "Network Security":            "#3f4c26",
  "IoT & Edge Computing":        "#374e2e",
  "Solar Energy":                "#2f5036",
  "Battery Technology":          "#27523e",
  "Hydrogen & Fuel Cells":       "#235448",
  "Wind & Ocean Energy":         "#1f5652",
  "Medical Devices":             "#1d5558",
  "Digital Health":              "#1b555f",
  "Neurotechnology":             "#1a5566",
  "Precision Medicine":          "#19546e",
  "3D Printing & Additive":      "#195474",
  "Smart Materials":             "#19547a",
  "Quantum Technology":          "#19547b",
  "Space Technology":            "#19547b",
};

// ─── Domain (L1) hierarchy ────────────────────────────────────────────────────
export interface DomainDef {
  name: string;
  color: string;   // representative colour for bulk-select chip
  subcategories: string[];
}

export const DOMAIN_HIERARCHY: DomainDef[] = [
  {
    name: "AI & Machine Learning",
    color: "#ffd89b",
    subcategories: ["Natural Language Processing", "Computer Vision", "Reinforcement Learning", "AI Hardware & Chips"],
  },
  {
    name: "Biotechnology",
    color: "#d3b87b",
    subcategories: ["Gene Editing", "Drug Discovery", "Synthetic Biology", "Diagnostics & Imaging"],
  },
  {
    name: "Semiconductors",
    color: "#a7985b",
    subcategories: ["Memory & Storage", "Processor Architecture", "Advanced Packaging", "Photonics & Optics"],
  },
  {
    name: "Robotics & Automation",
    color: "#7b783b",
    subcategories: ["Autonomous Vehicles", "Industrial Automation", "Drone Technology", "Humanoid Robots"],
  },
  {
    name: "Telecommunications",
    color: "#4f581b",
    subcategories: ["5G & 6G Networks", "Satellite Communication", "Network Security", "IoT & Edge Computing"],
  },
  {
    name: "Clean Energy",
    color: "#2f5036",
    subcategories: ["Solar Energy", "Battery Technology", "Hydrogen & Fuel Cells", "Wind & Ocean Energy"],
  },
  {
    name: "Healthcare Technology",
    color: "#1d5558",
    subcategories: ["Medical Devices", "Digital Health", "Neurotechnology", "Precision Medicine"],
  },
  {
    name: "Advanced Manufacturing",
    color: "#19547b",
    subcategories: ["3D Printing & Additive", "Smart Materials", "Quantum Technology", "Space Technology"],
  },
];

// ─── L3 topics (for tag cloud row 3 — visual labels, click triggers concept search) ──
export const L3_TOPICS: Record<string, string[]> = {
  "Natural Language Processing":  ["Large Language Models", "Machine Translation", "Text Classification", "Speech Recognition"],
  "Computer Vision":              ["Object Detection", "Image Generation", "Video Understanding", "Optical Recognition"],
  "Reinforcement Learning":       ["Game AI", "Robotics Control", "Multi-Agent Systems", "Curriculum Learning"],
  "AI Hardware & Chips":          ["Neural Processing Units", "In-Memory Computing", "FPGAs for AI", "Photonic AI"],
  "Gene Editing":                 ["CRISPR-Cas Systems", "Base Editing", "Prime Editing", "AAV Delivery"],
  "Drug Discovery":               ["mRNA Therapeutics", "Protein Folding", "Antibody Engineering", "Small Molecule AI"],
  "Synthetic Biology":            ["Metabolic Engineering", "Cell-Free Systems", "Biosensors", "Genetic Circuits"],
  "Diagnostics & Imaging":        ["Liquid Biopsy", "Point-of-Care Devices", "AI-Aided Radiology", "Wearable Biosensors"],
  "Memory & Storage":             ["DRAM Scaling", "3D NAND Flash", "MRAM & PCRAM", "Persistent Memory"],
  "Processor Architecture":       ["RISC-V", "GPU Design", "Heterogeneous Computing", "Domain-Specific Accelerators"],
  "Advanced Packaging":           ["Chiplet Interconnect", "3D Stacking", "Fan-Out Wafer Level", "Thermal Management"],
  "Photonics & Optics":           ["Silicon Photonics", "LiDAR", "Optical Interconnects", "Quantum Photonics"],
  "Autonomous Vehicles":          ["Sensor Fusion", "Path Planning", "V2X Communication", "HD Mapping"],
  "Industrial Automation":        ["Collaborative Robots", "Visual Inspection", "Digital Twins", "Predictive Maintenance"],
  "Drone Technology":             ["VTOL Systems", "Swarm Coordination", "Drone Delivery", "Counter-Drone"],
  "Humanoid Robots":              ["Bipedal Locomotion", "Dexterous Manipulation", "Human-Robot Interaction", "Whole-Body Control"],
  "5G & 6G Networks":             ["Massive MIMO", "Network Slicing", "Beamforming", "THz Communications"],
  "Satellite Communication":      ["LEO Constellations", "Direct-to-Device", "Optical Sat Links", "On-Orbit Processing"],
  "Network Security":             ["Zero-Trust Architecture", "Post-Quantum Cryptography", "Threat Intelligence", "SASE"],
  "IoT & Edge Computing":         ["Edge AI Inference", "Smart Home Protocols", "Industrial IoT", "Energy-Harvesting Sensors"],
  "Solar Energy":                 ["Perovskite Solar Cells", "Tandem Cells", "BIPV", "Solar Concentrators"],
  "Battery Technology":           ["Solid-State Batteries", "Lithium-Sulfur", "Sodium-Ion", "Battery Management Systems"],
  "Hydrogen & Fuel Cells":        ["PEM Electrolyzers", "Green Hydrogen Storage", "Fuel Cell Stacks", "Hydrogen Pipelines"],
  "Wind & Ocean Energy":          ["Offshore Wind Turbines", "Tidal Stream", "Wave Energy Converters", "Airborne Wind"],
  "Medical Devices":              ["Surgical Robots", "Active Implants", "Smart Prosthetics", "Minimally Invasive Tools"],
  "Digital Health":               ["AI-Powered Diagnostics", "Remote Patient Monitoring", "Digital Therapeutics", "Health Data Platforms"],
  "Neurotechnology":              ["Brain-Computer Interfaces", "Neural Implants", "Closed-Loop Neurostimulation", "Cognitive Enhancement"],
  "Precision Medicine":           ["Pharmacogenomics", "Cell & Gene Therapy", "Liquid Biopsy Panels", "Multi-Omics AI"],
  "3D Printing & Additive":       ["Metal Additive Manufacturing", "Bioprinting", "Continuous Fibre Reinforcement", "4D Printing"],
  "Smart Materials":              ["Shape-Memory Alloys", "Self-Healing Polymers", "Piezoelectric Harvesting", "Metamaterials"],
  "Quantum Technology":           ["Superconducting Qubits", "Quantum Error Correction", "Quantum Sensing", "Quantum Communication"],
  "Space Technology":             ["Reusable Launch Vehicles", "In-Space Manufacturing", "Earth Observation AI", "Space Propulsion"],
};

// ─── Spatial layout for each L2 subcategory ──────────────────────────────────
// (cx, cy) = cluster centre in normalised [0,1] map coordinates
const SUBCATEGORY_POSITIONS: Record<string, { cx: number; cy: number }> = {
  // ── AI & ML (top-left) — near Semiconductors (the hardware that powers it) ──
  "Natural Language Processing": { cx: 0.12, cy: 0.14 },
  "Computer Vision":             { cx: 0.19, cy: 0.14 },
  "Reinforcement Learning":      { cx: 0.12, cy: 0.21 },
  "AI Hardware & Chips":         { cx: 0.19, cy: 0.21 },
  // ── Semiconductors (top-centre) — bridges AI ↔ Telecom ──
  "Processor Architecture":      { cx: 0.36, cy: 0.12 },
  "Memory & Storage":            { cx: 0.43, cy: 0.12 },
  "Advanced Packaging":          { cx: 0.36, cy: 0.19 },
  "Photonics & Optics":          { cx: 0.43, cy: 0.19 },
  // ── Telecommunications (top-right) — near Semiconductors & IoT ──
  "5G & 6G Networks":            { cx: 0.62, cy: 0.12 },
  "Network Security":            { cx: 0.69, cy: 0.12 },
  "Satellite Communication":     { cx: 0.62, cy: 0.19 },
  "IoT & Edge Computing":        { cx: 0.69, cy: 0.19 },
  // ── Robotics & Automation (mid-left) — near AI & Manufacturing ──
  "Industrial Automation":       { cx: 0.11, cy: 0.44 },
  "Autonomous Vehicles":         { cx: 0.18, cy: 0.44 },
  "Drone Technology":            { cx: 0.11, cy: 0.51 },
  "Humanoid Robots":             { cx: 0.18, cy: 0.51 },
  // ── Advanced Manufacturing (centre) — bridges Robotics ↔ Clean Energy ──
  "3D Printing & Additive":      { cx: 0.37, cy: 0.42 },
  "Smart Materials":             { cx: 0.44, cy: 0.42 },
  "Quantum Technology":          { cx: 0.37, cy: 0.49 },
  "Space Technology":            { cx: 0.44, cy: 0.49 },
  // ── Clean Energy (mid-right) — near Telecom/IoT (smart grid) & Manufacturing ──
  "Solar Energy":                { cx: 0.63, cy: 0.42 },
  "Battery Technology":          { cx: 0.70, cy: 0.42 },
  "Hydrogen & Fuel Cells":       { cx: 0.63, cy: 0.49 },
  "Wind & Ocean Energy":         { cx: 0.70, cy: 0.49 },
  // ── Biotechnology (bottom-left) — near Healthcare ──
  "Gene Editing":                { cx: 0.14, cy: 0.76 },
  "Drug Discovery":              { cx: 0.21, cy: 0.76 },
  "Synthetic Biology":           { cx: 0.14, cy: 0.83 },
  "Diagnostics & Imaging":       { cx: 0.21, cy: 0.83 },
  // ── Healthcare Technology (bottom-centre) — bridges Biotech ↔ AI (digital health) ──
  "Medical Devices":             { cx: 0.40, cy: 0.76 },
  "Digital Health":              { cx: 0.47, cy: 0.76 },
  "Neurotechnology":             { cx: 0.40, cy: 0.83 },
  "Precision Medicine":          { cx: 0.47, cy: 0.83 },
};

// ─── Per-category title/abstract content ─────────────────────────────────────
const TITLE_PREFIXES: Record<string, string[]> = {
  "Natural Language Processing":  ["Transformer-based", "Bidirectional encoder for", "Attention mechanism in", "Contextual embedding for", "Seq2seq model for"],
  "Computer Vision":              ["Convolutional detection of", "Vision transformer for", "Depth estimation via", "Real-time segmentation of", "Multi-scale feature extraction for"],
  "Reinforcement Learning":       ["Reward shaping in", "Policy gradient method for", "Model-based RL for", "Hierarchical agent for", "Off-policy learning in"],
  "AI Hardware & Chips":          ["Neural processing unit for", "In-memory inference accelerator", "Low-power AI chip for", "Sparse tensor compute for", "Systolic array design for"],
  "Gene Editing":                 ["CRISPR-Cas9 delivery system", "Base editing approach for", "Guide RNA optimisation for", "Prime editing in", "Genome-wide screening via"],
  "Drug Discovery":               ["mRNA therapeutic for", "Protein folding prediction in", "Antibody engineering approach", "High-throughput screening of", "AI-driven lead optimisation"],
  "Synthetic Biology":            ["Metabolic pathway engineering for", "Cell-free biosynthesis of", "Genetic circuit design for", "Orthogonal ribosome system", "Living sensor for"],
  "Diagnostics & Imaging":        ["Liquid biopsy method for", "Point-of-care assay for", "AI-assisted MRI for", "Wearable continuous monitoring of", "Multimodal biomarker panel for"],
  "Memory & Storage":             ["3D NAND cell structure for", "DRAM refresh optimisation", "Persistent memory controller", "Phase-change memory array", "MRAM write scheme for"],
  "Processor Architecture":       ["RISC-V extension for", "GPU microarchitecture for", "Domain-specific accelerator for", "Heterogeneous chip integration", "Out-of-order execution in"],
  "Advanced Packaging":           ["Chiplet interconnect fabric for", "3D stacking thermal solution", "Fan-out wafer-level package", "High-density interposer for", "Hybrid bonding approach for"],
  "Photonics & Optics":           ["Silicon photonics modulator", "LiDAR signal processing for", "Optical switch fabric for", "Quantum dot laser for", "Photonic integrated circuit"],
  "Autonomous Vehicles":          ["Sensor fusion pipeline for", "End-to-end driving model", "HD map compression for", "Fail-safe planning in", "V2X latency reduction for"],
  "Industrial Automation":        ["Collaborative robot force control", "Visual inspection system for", "Digital twin synchronisation", "Predictive maintenance via", "Flexible assembly cell for"],
  "Drone Technology":             ["VTOL transition control for", "Swarm path coordination", "Obstacle avoidance in UAVs", "Drone delivery optimisation", "Counter-UAS detection system"],
  "Humanoid Robots":              ["Whole-body locomotion for", "Dexterous hand control for", "Human-robot handover of", "Balance recovery in bipedal", "Learning from demonstration for"],
  "5G & 6G Networks":             ["Massive MIMO beamforming for", "Network slicing scheduler", "Sub-THz channel modelling", "Open RAN interface for", "AI-driven resource allocation in"],
  "Satellite Communication":      ["LEO constellation handover", "Direct-to-device link budget", "On-orbit edge processing for", "Optical inter-satellite link", "Ground station diversity for"],
  "Network Security":             ["Zero-trust access framework", "Post-quantum key exchange for", "Anomaly detection in network", "Micro-segmentation approach for", "Threat intelligence fusion"],
  "IoT & Edge Computing":         ["Energy-harvesting sensor node", "Federated learning at edge for", "Lightweight inference engine", "LPWAN protocol optimisation", "Smart home automation hub"],
  "Solar Energy":                 ["Perovskite cell stability via", "Tandem solar cell for", "Building-integrated PV for", "Solar concentrator optics", "Anti-reflective coating for"],
  "Battery Technology":           ["Solid-state electrolyte for", "Lithium-sulfur cathode", "Sodium-ion battery anode", "Battery management system for", "Fast-charging protocol for"],
  "Hydrogen & Fuel Cells":        ["PEM electrolyser stack", "Green hydrogen storage vessel", "Fuel cell membrane for", "Hydrogen embrittlement mitigation", "Ammonia cracking reactor"],
  "Wind & Ocean Energy":          ["Offshore wind foundation for", "Tidal turbine blade design", "Wave energy converter for", "Airborne wind kite system", "Floating offshore wind platform"],
  "Medical Devices":              ["Surgical robot kinematics for", "Active implant power system", "Smart prosthetic limb for", "Minimally invasive tool for", "Capsule endoscopy navigation"],
  "Digital Health":               ["AI diagnostic model for", "Remote patient monitoring via", "Digital therapeutic for", "Federated health data platform", "Clinical NLP pipeline for"],
  "Neurotechnology":              ["Brain-computer interface for", "Closed-loop neurostimulation", "Neural spike sorting in", "Wireless neural implant for", "Non-invasive BCI via"],
  "Precision Medicine":           ["Pharmacogenomic panel for", "Single-cell sequencing of", "Liquid biopsy ctDNA for", "Cell therapy manufacturing", "Multi-omics integration for"],
  "3D Printing & Additive":       ["Metal powder bed fusion for", "Bioprinting scaffold for", "Continuous fibre lay-up in", "4D printing actuation via", "Binder jetting of ceramics"],
  "Smart Materials":              ["Shape-memory alloy actuator", "Self-healing polymer coating", "Piezoelectric energy harvester", "Programmable metamaterial for", "Magnetostrictive sensor for"],
  "Quantum Technology":           ["Superconducting qubit gate", "Surface code error correction", "Trapped-ion quantum processor", "Quantum key distribution for", "Quantum-enhanced sensing of"],
  "Space Technology":             ["Reusable rocket propulsion for", "In-space manufacturing of", "Earth observation AI for", "Electric propulsion thruster", "Small satellite constellation"],
};

const TITLE_SUBJECTS: Record<string, string[]> = {
  "Natural Language Processing":  ["multilingual text classification", "dialogue system response generation", "document summarisation pipeline", "named entity recognition framework", "machine translation quality estimation", "semantic textual similarity scoring", "coreference resolution system", "low-resource language modelling"],
  "Computer Vision":              ["pedestrian detection in urban scenes", "aerial image semantic segmentation", "3-D point cloud reconstruction", "facial attribute recognition system", "medical image anomaly detection", "object pose estimation pipeline", "video action recognition framework", "multi-camera calibration method"],
  "Reinforcement Learning":       ["robotic manipulation task learning", "game-playing agent training", "autonomous navigation policy", "multi-agent cooperative task solving", "energy management optimisation", "drug dosage scheduling controller", "resource allocation in cloud systems", "adaptive traffic signal control"],
  "AI Hardware & Chips":          ["on-device language model inference", "sparse matrix multiplication", "real-time video analytics", "autonomous driving perception", "scientific simulation acceleration", "large-scale recommendation system", "edge vision processing", "mixed-precision training workloads"],
  "Gene Editing":                 ["sickle cell disease correction", "inherited retinal dystrophy therapy", "T-cell immunotherapy enhancement", "crop disease resistance engineering", "primary immunodeficiency treatment", "Duchenne muscular dystrophy repair", "cancer neoantigen modulation", "liver metabolic disorder correction"],
  "Drug Discovery":               ["KRAS oncogene inhibition", "SARS-CoV-2 protease targeting", "Alzheimer's amyloid clearance", "antibiotic resistance reversal", "inflammatory bowel disease treatment", "rare paediatric metabolic disorders", "chronic pain nociceptor modulation", "autoimmune T-cell regulation"],
  "Synthetic Biology":            ["vanillin biosynthesis pathway", "spider silk protein production", "biosensor for environmental toxins", "engineered gut microbiome therapy", "biofuel precursor accumulation", "nitrogen fixation in cereal crops", "therapeutic protein secretion system", "living wound healing dressing"],
  "Diagnostics & Imaging":        ["early-stage pancreatic cancer detection", "continuous glucose monitoring", "Alzheimer's plasma biomarker panel", "cardiac arrhythmia wearable detection", "sepsis rapid diagnosis platform", "TB drug resistance profiling", "prenatal chromosomal screening", "multi-cancer early detection assay"],
  "Memory & Storage":             ["high-density cold data archiving", "automotive-grade embedded storage", "AI training checkpoint caching", "enterprise NVMe storage controller", "near-storage data analytics", "persistent memory transaction logging", "video surveillance buffering", "edge device over-the-air update"],
  "Processor Architecture":       ["large language model inference", "sparse neural network execution", "real-time ray tracing acceleration", "genomic sequence alignment", "autonomous vehicle sensor fusion", "high-frequency trading latency reduction", "scientific climate modelling", "secure confidential computing"],
  "Advanced Packaging":           ["co-packaged optics for data centres", "mobile SoC thermal management", "HBM memory integration platform", "heterogeneous AI accelerator tile", "automotive radar-compute co-integration", "high-bandwidth switch ASIC packaging", "wearable ultra-thin flexible module", "space-grade radiation-tolerant assembly"],
  "Photonics & Optics":           ["data-centre optical interconnect", "autonomous vehicle LiDAR receiver", "quantum key distribution channel", "augmented reality waveguide display", "medical OCT imaging probe", "fibre-optic gyroscope for navigation", "photonic neural network inference", "free-space optical satellite link"],
  "Autonomous Vehicles":          ["urban intersection navigation", "highway lane-change manoeuvring", "adverse-weather perception robustness", "pedestrian intent prediction system", "parking and low-speed manoeuvring", "fleet-level map update distribution", "emergency vehicle response detection", "construction zone traversal planning"],
  "Industrial Automation":        ["automotive body-panel welding", "pharmaceutical blister-pack assembly", "semiconductor wafer handling", "food-grade packaging line inspection", "aircraft fuselage riveting process", "e-commerce fulfilment bin picking", "steel mill quality control vision", "hazardous material handling robot"],
  "Drone Technology":             ["last-mile parcel delivery routing", "wind-turbine blade inspection", "precision crop spraying guidance", "search-and-rescue area coverage", "infrastructure corridor monitoring", "wildfire front mapping mission", "urban air mobility traffic management", "beyond-visual-line-of-sight relay"],
  "Humanoid Robots":              ["household chore task execution", "elderly care assistance interaction", "disaster site search and rescue", "retail shelf restocking workflow", "construction site material handling", "collaborative assembly with humans", "staircase and door navigation", "tool use and handover operations"],
  "5G & 6G Networks":             ["industrial IoT ultra-reliable link", "extended reality low-latency stream", "connected vehicle platooning sync", "smart factory private network slice", "emergency services priority channel", "stadium massive-user capacity", "telemedicine remote surgery link", "drone swarm command-and-control"],
  "Satellite Communication":      ["global maritime broadband access", "aviation passenger connectivity", "rural remote education service", "precision agriculture telemetry link", "disaster recovery emergency comms", "Arctic region permanent coverage", "direct smartphone-to-satellite SMS", "IoT asset tracking from orbit"],
  "Network Security":             ["enterprise cloud workload protection", "software supply chain integrity", "operational technology network defence", "insider threat behavioural detection", "ransomware lateral movement blocking", "API gateway fraud prevention", "certificate lifecycle management", "multi-cloud identity federation"],
  "IoT & Edge Computing":         ["smart building energy management", "predictive factory equipment health", "cold-chain logistics freshness monitor", "connected insulin delivery device", "smart grid demand response node", "railway track condition sensing", "precision agriculture soil sensor", "retail inventory RFID tracking"],
  "Solar Energy":                 ["residential rooftop retrofit module", "agrivoltaic dual-use canopy system", "floating offshore solar array", "building façade bifacial installation", "utility-scale desert tracker field", "portable off-grid power station", "solar-powered water desalination", "high-albedo urban heat island reduction"],
  "Battery Technology":           ["EV fast-charge safety management", "grid-scale peak-shaving storage", "aviation electrification power system", "wearable device ultra-thin cell", "maritime vessel propulsion battery", "drone high-power-density pack", "residential solar storage unit", "second-life battery repurposing"],
  "Hydrogen & Fuel Cells":        ["green steel direct reduction", "long-haul truck fuel cell drivetrain", "airport ground support equipment", "backup power for data centres", "maritime zero-emission propulsion", "ammonia-to-hydrogen reconversion", "hydrogen refuelling station control", "seasonal underground hydrogen storage"],
  "Wind & Ocean Energy":          ["floating deep-water wind installation", "tidal stream turbine array", "nearshore wave energy farm", "repowering ageing onshore wind sites", "offshore wind O&M optimisation", "airborne wind turbine deployment", "hybrid wind-solar islanded microgrid", "current turbine riverine power"],
  "Medical Devices":              ["minimally invasive cardiac ablation", "continuous intracranial pressure sensing", "closed-loop insulin delivery system", "robotic cochlear implant insertion", "transcutaneous bone conduction hearing", "smart contact lens glucose sensing", "endoscopic submucosal dissection tool", "osseointegrated upper-limb prosthetic"],
  "Digital Health":               ["post-surgical recovery monitoring", "mental health digital biomarker capture", "medication adherence nudge system", "early sepsis deterioration alert", "chronic obstructive pulmonary disease management", "type 2 diabetes lifestyle intervention", "remote cardiac rehabilitation programme", "paediatric asthma action plan app"],
  "Neurotechnology":              ["motor cortex prosthetic control", "epilepsy seizure prediction and prevention", "deep brain stimulation for Parkinson's", "auditory brainstem hearing restoration", "depression closed-loop neuromodulation", "spinal cord injury bypass system", "locked-in syndrome communication", "memory consolidation enhancement during sleep"],
  "Precision Medicine":           ["non-small-cell lung cancer stratification", "breast cancer minimal residual disease", "immunotherapy responder prediction", "rare monogenic disease diagnosis", "cardiovascular polygenic risk scoring", "pharmacogenomic warfarin dosing", "CAR-T manufacturing process control", "microbiome-guided therapeutic selection"],
  "3D Printing & Additive":       ["titanium orthopaedic implant printing", "rocket engine combustion chamber fabrication", "patient-specific surgical guide production", "consumer electronics injection mould tooling", "concrete construction formwork printing", "electronic circuit substrate deposition", "customised hearing aid shell forming", "food texture and nutrition personalisation"],
  "Smart Materials":              ["structural health monitoring in aircraft", "deployable space antenna morphing", "soft robotic gripper actuation", "self-sealing fuel tank coating", "vibration damping in precision instruments", "thermochromic building façade glazing", "impact-absorbing helmet liner", "auxetic textile for protective apparel"],
  "Quantum Technology":           ["drug molecule ground-state simulation", "portfolio optimisation on near-term hardware", "cryptographic protocol vulnerability analysis", "logistics route planning acceleration", "materials property ab initio calculation", "quantum random number generation", "entanglement-based secure communication", "quantum-enhanced gravitational sensing"],
  "Space Technology":             ["Earth surface deformation monitoring", "maritime vessel traffic surveillance", "wildfire smoke plume detection", "precision GPS augmentation service", "on-orbit satellite servicing mission", "lunar regolith resource extraction", "deep-space relay communication node", "re-entry vehicle thermal protection"],
};

const ABSTRACT_TEMPLATES: Record<string, string> = {
  "Natural Language Processing":  "A method and system for natural language understanding using transformer-based architectures, enabling improved context modelling, semantic comprehension, and generation for downstream tasks including summarisation, translation, and question answering.",
  "Computer Vision":              "An apparatus and method for visual perception using deep convolutional and vision-transformer networks, providing robust object detection, semantic segmentation, and 3-D reconstruction under varied illumination and viewpoint conditions.",
  "Reinforcement Learning":       "A reinforcement learning framework incorporating reward shaping, hierarchical policies, and model-based planning, enabling sample-efficient training of agents for sequential decision-making in complex, partially observable environments.",
  "AI Hardware & Chips":          "A neuromorphic processing unit with configurable dataflow architecture, sparse tensor execution, and on-chip SRAM for zero-copy inference, achieving high throughput at sub-milliwatt power budgets for edge AI applications.",
  "Gene Editing":                 "A CRISPR-based gene editing system with engineered guide RNAs, high-fidelity Cas variants, and lipid nanoparticle delivery vehicles providing tissue-specific editing with reduced off-target effects and enhanced therapeutic safety.",
  "Drug Discovery":               "A computational drug discovery platform combining physics-based molecular dynamics simulations with deep generative models to identify and optimise novel lead compounds with improved binding affinity, selectivity, and ADMET profiles.",
  "Synthetic Biology":            "A synthetic biology toolkit comprising orthogonal genetic parts, modular metabolic pathways, and CRISPR-assisted genome integration for programmable biosynthesis of high-value chemicals, proteins, and biomaterials in microbial hosts.",
  "Diagnostics & Imaging":        "A multimodal diagnostic system integrating liquid biopsy biomarkers, AI-assisted imaging analysis, and wearable continuous monitoring to provide early disease detection with high sensitivity and specificity at the point of care.",
  "Memory & Storage":             "A three-dimensional memory array architecture employing high-aspect-ratio charge-trap cells, novel dielectric materials, and controller-level error correction to achieve high-density, high-endurance non-volatile storage with low read latency.",
  "Processor Architecture":       "A domain-specific processor architecture featuring configurable execution units, near-data processing capabilities, and hardware-software co-design optimisations that deliver significant performance-per-watt improvements for AI and HPC workloads.",
  "Advanced Packaging":           "A heterogeneous integration packaging technology using hybrid bonding, chiplet disaggregation, and advanced thermal management structures to achieve high-bandwidth die-to-die interconnect at reduced form factor and power consumption.",
  "Photonics & Optics":           "A photonic integrated circuit platform utilising silicon nitride waveguides, electro-optic modulators, and integrated photodetectors to provide high-bandwidth, low-latency optical interconnects and sensing capabilities on CMOS-compatible substrates.",
  "Autonomous Vehicles":          "An autonomous vehicle perception and planning system combining radar, LiDAR, and camera sensor fusion with end-to-end trainable neural networks for robust scene understanding, trajectory prediction, and real-time path planning in complex urban environments.",
  "Industrial Automation":        "An industrial automation system integrating collaborative robot arms, machine-vision inspection, and digital-twin synchronisation to enable flexible, safe, and adaptable manufacturing processes with predictive maintenance and zero-defect quality control.",
  "Drone Technology":             "A UAV platform with VTOL hybrid propulsion, autonomous swarm coordination algorithms, and redundant flight control systems enabling reliable last-mile delivery, inspection, and surveillance operations in dynamic and GPS-denied environments.",
  "Humanoid Robots":              "A humanoid robot system with whole-body motion planning, tactile feedback integration, and imitation-learning-based skill acquisition, enabling safe and dexterous interaction with unstructured human environments and collaborative task execution.",
  "5G & 6G Networks":             "A next-generation wireless network architecture employing massive MIMO beamforming, AI-driven resource orchestration, and network slicing to deliver ultra-reliable low-latency communication for critical IoT, industrial, and extended-reality applications.",
  "Satellite Communication":      "A low-Earth-orbit satellite communication system with inter-satellite optical links, adaptive coding and modulation, and on-orbit edge processing to provide global broadband connectivity with low latency and high spectrum efficiency.",
  "Network Security":             "A zero-trust network security framework incorporating continuous authentication, microsegmentation, and AI-powered anomaly detection to protect distributed enterprise systems against advanced persistent threats and supply-chain attacks.",
  "IoT & Edge Computing":         "An edge-AI inference platform with energy-harvesting sensor nodes, federated learning protocols, and lightweight model compression enabling intelligent, privacy-preserving data processing at the extreme edge of IoT deployments.",
  "Solar Energy":                 "A high-efficiency photovoltaic module employing perovskite-silicon tandem cell architecture with anti-reflective coatings, laser edge isolation, and encapsulation engineering to achieve high power conversion efficiency with long-term outdoor stability.",
  "Battery Technology":           "A solid-state battery system with inorganic sulphide electrolyte, lithium-metal anode engineering, and advanced formation protocols that provide high energy density, fast-charging capability, and improved thermal safety for electric vehicle and stationary storage applications.",
  "Hydrogen & Fuel Cells":        "A proton-exchange-membrane electrolyser stack with advanced iridium-free catalysts, reinforced membranes, and flow-field optimisation for high-efficiency, durable green hydrogen production, coupled with efficient storage and distribution systems.",
  "Wind & Ocean Energy":          "An offshore wind energy system with floating tension-leg platform foundations, direct-drive permanent-magnet generators, and AI-based blade pitch control optimised for deep-water sites, providing increased energy yield and reduced levelised cost of energy.",
  "Medical Devices":              "A minimally invasive surgical robot system with force-torque feedback, AI-assisted instrument tracking, and cloud-connected teleoperation capabilities providing surgeons with enhanced dexterity and situational awareness during complex laparoscopic procedures.",
  "Digital Health":               "A federated digital health platform integrating AI diagnostic models, remote patient monitoring devices, and personalised digital therapeutic interventions to enable proactive disease management while preserving patient privacy across distributed healthcare institutions.",
  "Neurotechnology":              "A fully implantable brain-computer interface device with high-channel-count electrode arrays, wireless power delivery, and closed-loop neural stimulation for restoring motor function, treating neurological disorders, and enabling direct neural communication.",
  "Precision Medicine":           "A precision oncology platform combining single-cell multi-omics profiling, liquid biopsy circulating tumour DNA analysis, and AI-driven treatment recommendation to personalise therapy selection and monitor minimal residual disease in real time.",
  "3D Printing & Additive":       "An additive manufacturing system employing laser powder bed fusion with in-process monitoring, topological optimisation software, and post-process heat treatment protocols to produce near-net-shape metal components with aerospace-grade mechanical properties.",
  "Smart Materials":              "A programmable smart material system incorporating shape-memory alloy actuators, self-healing polymer matrices, and piezoelectric energy-harvesting elements, enabling structural health monitoring, morphing surfaces, and energy-autonomous adaptive structures.",
  "Quantum Technology":           "A superconducting quantum processor with surface-code error correction, high-fidelity two-qubit gates, and modular connectivity architecture, providing a scalable path to fault-tolerant quantum computation for optimisation, simulation, and cryptography applications.",
  "Space Technology":             "A small-satellite constellation architecture with electric propulsion, AI-based earth observation data processing, and inter-satellite optical mesh networking, enabling continuous global coverage for climate monitoring, precision agriculture, and disaster response.",
};

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────
function makePrng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Patent generation ────────────────────────────────────────────────────────
const ASSIGNEES = [
  "DeepMind Technologies", "NVIDIA Corporation", "Alphabet Inc.", "Microsoft Research",
  "Samsung Electronics", "TSMC Ltd.", "Qualcomm Inc.", "Intel Corporation",
  "Moderna Therapeutics", "Genentech Inc.", "Illumina Inc.", "Thermo Fisher Scientific",
  "Tesla Inc.", "Boston Dynamics", "ABB Robotics", "KUKA AG",
  "Ericsson AB", "Nokia Technologies", "SpaceX Inc.", "Airbus SE",
  "Siemens AG", "GE Renewable Energy", "SunPower Corporation", "QuantumScape Corp.",
  "Intuitive Surgical", "Medtronic plc", "Neuralink Corp.", "Illumina Genomics",
  "Stratasys Ltd.", "Desktop Metal Inc.", "IonQ Inc.", "Rigetti Computing",
];

let _cached: Patent[] | null = null;

export function generateMockPatents(): Patent[] {
  if (_cached) return _cached;
  const rand = makePrng(42);
  const patents: Patent[] = [];
  let id = 1;

  const allSubcategories = Object.keys(SUBCATEGORY_POSITIONS);

  for (const subcat of allSubcategories) {
    const { cx, cy } = SUBCATEGORY_POSITIONS[subcat];
    const prefixes = TITLE_PREFIXES[subcat] ?? [`${subcat} method for`, `System and method of`, `Apparatus for`, `Process for`];
    const subjects = TITLE_SUBJECTS[subcat] ?? [`improved ${subcat.toLowerCase()} systems`, `next-generation ${subcat.toLowerCase()} devices`, `scalable ${subcat.toLowerCase()} platform`, `efficient ${subcat.toLowerCase()} method`];
    const abstract = ABSTRACT_TEMPLATES[subcat] ?? `A novel ${subcat.toLowerCase()} invention providing improvements in efficiency, scalability, and performance over existing approaches.`;
    const count = 90;

    for (let i = 0; i < count; i++) {
      const angle = rand() * 2 * Math.PI;
      const r = Math.sqrt(rand()) * 0.09;          // wider spread for cluster overlap
      // Concentrate more patents in 2024 to represent "last year" data
      const yearBias = rand();
      const year = yearBias > 0.35
        ? 2020 + Math.floor(rand() * 5)            // 2020–2024
        : 2000 + Math.floor(rand() * 20);          // 2000–2019
      const pid = `US${year}${String(id).padStart(7, "0")}`;
      const prefix = prefixes[Math.floor(rand() * prefixes.length)];
      const subject = subjects[Math.floor(rand() * subjects.length)];
      const assignee = ASSIGNEES[Math.floor(rand() * ASSIGNEES.length)];

      patents.push({
        id: pid,
        title: `${prefix} ${subject}`,
        year,
        category: subcat,
        x: Math.max(0.02, Math.min(0.98, cx + r * Math.cos(angle))),
        y: Math.max(0.02, Math.min(0.98, cy + r * Math.sin(angle))),
        abstract,
        assignee,
        ipcCodes: [],
        citationCount: Math.floor(rand() * 80),
      });
      id++;
    }
  }

  // Cross-domain scattered patents
  for (let i = 0; i < 200; i++) {
    const subcat = allSubcategories[Math.floor(rand() * allSubcategories.length)];
    const year = 2000 + Math.floor(rand() * 25);
    const pid = `US${year}${String(id).padStart(7, "0")}`;
    patents.push({
      id: pid,
      title: `${(TITLE_PREFIXES[subcat] ?? ["Method for"])[Math.floor(rand() * (TITLE_PREFIXES[subcat]?.length ?? 1))]} ${(TITLE_SUBJECTS[subcat] ?? [`${subcat.toLowerCase()} systems`])[Math.floor(rand() * (TITLE_SUBJECTS[subcat]?.length ?? 1))]}`,
      year,
      category: subcat,
      x: 0.05 + rand() * 0.9,
      y: 0.05 + rand() * 0.9,
      abstract: `A cross-domain patent intersecting ${subcat.toLowerCase()} with adjacent technological fields, providing novel applications in previously unexplored problem spaces.`,
      assignee: ASSIGNEES[Math.floor(rand() * ASSIGNEES.length)],
      ipcCodes: [],
      citationCount: Math.floor(rand() * 30),
    });
    id++;
  }

  _cached = patents;
  return patents;
}

export function generateMockCitationGraph(patents: Patent[]): CitationGraph {
  const rand = makePrng(99);
  const links: Array<{ source: string; target: string }> = [];
  const seen = new Set<string>();
  for (const patent of patents) {
    const same = patents.filter(p => p.category === patent.category && p.id !== patent.id);
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n && i < same.length; i++) {
      const target = same[Math.floor(rand() * same.length)];
      const key = `${patent.id}→${target.id}`;
      if (!seen.has(key) && !seen.has(`${target.id}→${patent.id}`)) {
        seen.add(key);
        links.push({ source: patent.id, target: target.id });
      }
    }
  }
  return { nodes: patents, links };
}
