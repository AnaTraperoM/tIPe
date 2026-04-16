// ─── Colour palette ──────────────────────────────────────────────────────────
// L2 subcategory → hex colour (used for dot / chip rendering)
export const CATEGORY_COLORS: Record<string, string> = {
  // AI & ML — Orange
  "Natural Language Processing": "#F0A030",
  "Computer Vision":             "#E89830",
  "Reinforcement Learning":      "#D99028",
  "AI Hardware & Chips":         "#CC8820",
  // Biotechnology — Yellow
  "Gene Editing":                "#E8D44D",
  "Drug Discovery":              "#DBCA42",
  "Synthetic Biology":           "#CEC038",
  "Diagnostics & Imaging":       "#C1B62E",
  // Semiconductors — Green
  "Memory & Storage":            "#6B8B4A",
  "Processor Architecture":      "#608242",
  "Advanced Packaging":          "#55793A",
  "Photonics & Optics":          "#4A7032",
  // Robotics — Teal
  "Autonomous Vehicles":         "#3D8B8B",
  "Industrial Automation":       "#358282",
  "Drone Technology":            "#2D7979",
  "Humanoid Robots":             "#257070",
  // Telecom — Blue
  "5G & 6G Networks":            "#7B8FD4",
  "Satellite Communication":     "#7085CC",
  "Network Security":            "#657BC4",
  "IoT & Edge Computing":        "#5A71BC",
  // Clean Energy — Purple
  "Solar Energy":                "#9B6BCD",
  "Battery Technology":          "#9060C4",
  "Hydrogen & Fuel Cells":       "#8555BB",
  "Wind & Ocean Energy":         "#7A4AB2",
  // Healthcare — Rose
  "Medical Devices":             "#D4627B",
  "Digital Health":              "#CB5872",
  "Neurotechnology":             "#C24E69",
  "Precision Medicine":          "#B94460",
  // Advanced Manufacturing — Amber
  "3D Printing & Additive":      "#C47D2A",
  "Smart Materials":             "#B87324",
  "Quantum Technology":          "#AC691E",
  "Space Technology":            "#A05F18",
};

// ─── Domain (L1) hierarchy ────────────────────────────────────────────────────
export interface DomainDef {
  name: string;
  color: string;
  subcategories: string[];
}

export const DOMAIN_HIERARCHY: DomainDef[] = [
  {
    name: "AI & Machine Learning",
    color: "#F0A030",
    subcategories: ["Natural Language Processing", "Computer Vision", "Reinforcement Learning", "AI Hardware & Chips"],
  },
  {
    name: "Biotechnology",
    color: "#E8D44D",
    subcategories: ["Gene Editing", "Drug Discovery", "Synthetic Biology", "Diagnostics & Imaging"],
  },
  {
    name: "Semiconductors",
    color: "#6B8B4A",
    subcategories: ["Memory & Storage", "Processor Architecture", "Advanced Packaging", "Photonics & Optics"],
  },
  {
    name: "Robotics & Automation",
    color: "#3D8B8B",
    subcategories: ["Autonomous Vehicles", "Industrial Automation", "Drone Technology", "Humanoid Robots"],
  },
  {
    name: "Telecommunications",
    color: "#7B8FD4",
    subcategories: ["5G & 6G Networks", "Satellite Communication", "Network Security", "IoT & Edge Computing"],
  },
  {
    name: "Clean Energy",
    color: "#9B6BCD",
    subcategories: ["Solar Energy", "Battery Technology", "Hydrogen & Fuel Cells", "Wind & Ocean Energy"],
  },
  {
    name: "Healthcare Technology",
    color: "#D4627B",
    subcategories: ["Medical Devices", "Digital Health", "Neurotechnology", "Precision Medicine"],
  },
  {
    name: "Advanced Manufacturing",
    color: "#C47D2A",
    subcategories: ["3D Printing & Additive", "Smart Materials", "Quantum Technology", "Space Technology"],
  },
];

// ─── L3 topics (for tag cloud — visual labels, click triggers concept search) ──
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
