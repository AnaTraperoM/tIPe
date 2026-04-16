import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlugAndCreate from "../components/PlugAndCreate";
import type { Patent, PlugCreateResult } from "../lib/types";

// ── Test fixtures ────────────────────────────────────────────────────────────

const makePatent = (id: string, title: string, category = "Computer Vision"): Patent => ({
  id,
  title,
  abstract: `Abstract for ${title}`,
  category,
  subcategory: category,
  year: 2022,
  assignee: "TestCorp",
  x: 0,
  y: 0,
  claims: [],
  citations: [],
});

const patent1 = makePatent("P1", "Neural Image Segmentation");
const patent2 = makePatent("P2", "Optical Flow Estimation", "Photonics & Optics");
const patent3 = makePatent("P3", "Object Detection via LiDAR", "Autonomous Vehicles");

// ── Plug & Create Panel ──────────────────────────────────────────────────────

describe("PlugAndCreate", () => {
  const defaultProps = {
    patents: [patent1, patent2, patent3],
    selectedPatents: new Map<string, Patent>(),
    onTogglePatent: vi.fn(),
    onGenerate: vi.fn(),
    onCheckLandscape: vi.fn(),
    result: null,
    loading: false,
    onClose: vi.fn(),
    onMainMenu: vi.fn(),
    onSearch: vi.fn(() => []),
  };

  it("renders header and selection tabs", () => {
    render(<PlugAndCreate {...defaultProps} />);

    expect(screen.getByText("Plug & Create")).toBeInTheDocument();
    expect(screen.getByText("Combine 2+ patents to generate a novel idea")).toBeInTheDocument();
    expect(screen.getByText("Click on Map")).toBeInTheDocument();
    expect(screen.getByText("Search Patents")).toBeInTheDocument();
  });

  it("shows click instructions on map tab (default)", () => {
    render(<PlugAndCreate {...defaultProps} />);

    expect(screen.getByText(/Click on patents in the map to select them/)).toBeInTheDocument();
    expect(screen.getByText(/Select 2 or more to generate an idea/)).toBeInTheDocument();
  });

  it("generate button is disabled with fewer than 2 patents", () => {
    render(<PlugAndCreate {...defaultProps} />);

    const btn = screen.getByText("Generate New Idea");
    expect(btn.closest("button")).toBeDisabled();
    expect(screen.getByText("Select at least 2 patents to generate an idea")).toBeInTheDocument();
  });

  it("generate button enables with 2+ selected patents", () => {
    const selected = new Map<string, Patent>([
      [patent1.id, patent1],
      [patent2.id, patent2],
    ]);
    render(<PlugAndCreate {...defaultProps} selectedPatents={selected} />);

    const btn = screen.getByText("Generate New Idea");
    expect(btn.closest("button")).not.toBeDisabled();
  });

  it("displays selected patents list", () => {
    const selected = new Map<string, Patent>([
      [patent1.id, patent1],
      [patent2.id, patent2],
    ]);
    render(<PlugAndCreate {...defaultProps} selectedPatents={selected} />);

    expect(screen.getByText("Selected (2)")).toBeInTheDocument();
    expect(screen.getByText("Neural Image Segmentation")).toBeInTheDocument();
    expect(screen.getByText("Optical Flow Estimation")).toBeInTheDocument();
  });

  it("calls onTogglePatent when removing a patent from selection", () => {
    const onTogglePatent = vi.fn();
    const selected = new Map<string, Patent>([
      [patent1.id, patent1],
      [patent2.id, patent2],
    ]);
    render(
      <PlugAndCreate {...defaultProps} selectedPatents={selected} onTogglePatent={onTogglePatent} />
    );

    // Click the X button on the first selected patent
    const removeButtons = screen.getAllByRole("button").filter((btn) => {
      const svg = btn.querySelector("svg");
      return svg && btn.closest("[style]")?.textContent?.includes("Neural Image Segmentation");
    });
    // Use the X buttons in the selected list (they have X icon size 12)
    const selectedSection = screen.getByText("Selected (2)").parentElement;
    const xButtons = selectedSection?.querySelectorAll("button");
    if (xButtons && xButtons.length > 0) {
      fireEvent.click(xButtons[0]);
      expect(onTogglePatent).toHaveBeenCalled();
    }
  });

  it("calls onGenerate when generate button is clicked", () => {
    const onGenerate = vi.fn();
    const selected = new Map<string, Patent>([
      [patent1.id, patent1],
      [patent2.id, patent2],
    ]);
    render(<PlugAndCreate {...defaultProps} selectedPatents={selected} onGenerate={onGenerate} />);

    fireEvent.click(screen.getByText("Generate New Idea"));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("shows loading state while generating", () => {
    const selected = new Map<string, Patent>([
      [patent1.id, patent1],
      [patent2.id, patent2],
    ]);
    render(<PlugAndCreate {...defaultProps} selectedPatents={selected} loading={true} />);

    expect(screen.getByText("Generating idea...")).toBeInTheDocument();
  });

  it("switches to search tab and shows search input", () => {
    render(<PlugAndCreate {...defaultProps} />);

    fireEvent.click(screen.getByText("Search Patents"));
    expect(screen.getByPlaceholderText("Search patents by keyword...")).toBeInTheDocument();
  });

  it("calls onSearch when typing and pressing Enter", () => {
    const onSearch = vi.fn(() => [patent1, patent2]);
    render(<PlugAndCreate {...defaultProps} onSearch={onSearch} />);

    fireEvent.click(screen.getByText("Search Patents"));
    const input = screen.getByPlaceholderText("Search patents by keyword...");
    fireEvent.change(input, { target: { value: "neural" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearch).toHaveBeenCalledWith("neural");
  });

  it("displays search results and allows toggling", () => {
    const onSearch = vi.fn(() => [patent1, patent2]);
    const onTogglePatent = vi.fn();
    render(
      <PlugAndCreate {...defaultProps} onSearch={onSearch} onTogglePatent={onTogglePatent} />
    );

    fireEvent.click(screen.getByText("Search Patents"));
    const input = screen.getByPlaceholderText("Search patents by keyword...");
    fireEvent.change(input, { target: { value: "neural" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Results should show
    expect(screen.getByText("Neural Image Segmentation")).toBeInTheDocument();
    expect(screen.getByText("Optical Flow Estimation")).toBeInTheDocument();

    // Click a result to toggle
    fireEvent.click(screen.getByText("Neural Image Segmentation"));
    expect(onTogglePatent).toHaveBeenCalledWith(patent1);
  });

  it("calls onMainMenu and onClose", () => {
    const onMainMenu = vi.fn();
    const onClose = vi.fn();
    render(<PlugAndCreate {...defaultProps} onMainMenu={onMainMenu} onClose={onClose} />);

    fireEvent.click(screen.getByText("Main Menu"));
    expect(onMainMenu).toHaveBeenCalledOnce();
  });
});

// ── Plug & Create Result View ────────────────────────────────────────────────

describe("PlugAndCreate Result", () => {
  const mockResult: PlugCreateResult = {
    title: "Neural-Optical Hybrid Sensing",
    description:
      "A system combining neural image segmentation with optical flow estimation for real-time 3D scene understanding.",
    sourceElements: [
      {
        patentId: "P1",
        patentTitle: "Neural Image Segmentation",
        feature: "Pixel-level semantic labeling using deep CNNs",
      },
      {
        patentId: "P2",
        patentTitle: "Optical Flow Estimation",
        feature: "Dense motion field computation between frames",
      },
    ],
    noveltyAssessment:
      "The combination of pixel-level segmentation with dense optical flow for joint 3D reconstruction is not covered by existing patents.",
    suggestedClaims: [
      "A method for real-time 3D scene reconstruction comprising jointly processing segmentation and optical flow data.",
      "A system comprising a neural segmentation module and an optical flow module operating on synchronized image pairs.",
    ],
  };

  const resultProps = {
    patents: [patent1, patent2],
    selectedPatents: new Map<string, Patent>([
      [patent1.id, patent1],
      [patent2.id, patent2],
    ]),
    onTogglePatent: vi.fn(),
    onGenerate: vi.fn(),
    onCheckLandscape: vi.fn(),
    result: mockResult,
    loading: false,
    onClose: vi.fn(),
    onMainMenu: vi.fn(),
    onSearch: vi.fn(() => []),
  };

  it("renders result title and description", () => {
    render(<PlugAndCreate {...resultProps} />);

    expect(screen.getByText("Neural-Optical Hybrid Sensing")).toBeInTheDocument();
    expect(screen.getByText(/combining neural image segmentation/)).toBeInTheDocument();
  });

  it("renders source elements from both patents", () => {
    render(<PlugAndCreate {...resultProps} />);

    expect(screen.getByText("Source Elements")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
    expect(screen.getByText(/Pixel-level semantic labeling/)).toBeInTheDocument();
    expect(screen.getByText(/Dense motion field computation/)).toBeInTheDocument();
  });

  it("renders novelty assessment", () => {
    render(<PlugAndCreate {...resultProps} />);

    expect(screen.getByText("Novelty Assessment")).toBeInTheDocument();
    expect(screen.getByText(/not covered by existing patents/)).toBeInTheDocument();
  });

  it("renders suggested claims", () => {
    render(<PlugAndCreate {...resultProps} />);

    expect(screen.getByText("Suggested Claims")).toBeInTheDocument();
    expect(screen.getByText("Claim 1.")).toBeInTheDocument();
    expect(screen.getByText("Claim 2.")).toBeInTheDocument();
    expect(screen.getByText(/real-time 3D scene reconstruction/)).toBeInTheDocument();
  });

  it("renders 'Check Patent Landscape' button", () => {
    render(<PlugAndCreate {...resultProps} />);

    expect(screen.getByText("Check Patent Landscape →")).toBeInTheDocument();
  });

  it("calls onCheckLandscape with description when button is clicked", () => {
    const onCheckLandscape = vi.fn();
    render(<PlugAndCreate {...resultProps} onCheckLandscape={onCheckLandscape} />);

    fireEvent.click(screen.getByText("Check Patent Landscape →"));
    expect(onCheckLandscape).toHaveBeenCalledOnce();
    expect(onCheckLandscape.mock.calls[0][0]).toContain("Neural-Optical Hybrid Sensing");
  });
});

// ── Mock Data Audit ──────────────────────────────────────────────────────────

describe("No mock data in live code", () => {
  it("mock-data.ts only exports config constants (no generateMock* functions)", async () => {
    const mockData = await import("../lib/mock-data");
    const exports = Object.keys(mockData);

    // Should only have these 3 config exports
    expect(exports).toContain("CATEGORY_COLORS");
    expect(exports).toContain("DOMAIN_HIERARCHY");
    expect(exports).toContain("L3_TOPICS");

    // Should NOT have any mock generation functions
    expect(exports).not.toContain("generateMockPatents");
    expect(exports).not.toContain("generateMockCitationGraph");
    expect(exports).not.toContain("SUBCATEGORY_POSITIONS");
    expect(exports).not.toContain("ASSIGNEES");
    expect(exports).not.toContain("makePrng");
  });

  it("CATEGORY_COLORS has entries for all subcategories in DOMAIN_HIERARCHY", async () => {
    const { CATEGORY_COLORS, DOMAIN_HIERARCHY } = await import("../lib/mock-data");

    for (const domain of DOMAIN_HIERARCHY) {
      for (const sub of domain.subcategories) {
        expect(CATEGORY_COLORS[sub]).toBeDefined();
        expect(typeof CATEGORY_COLORS[sub]).toBe("string");
        expect(CATEGORY_COLORS[sub]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  it("L3_TOPICS has entries for all subcategories", async () => {
    const { L3_TOPICS, DOMAIN_HIERARCHY } = await import("../lib/mock-data");

    for (const domain of DOMAIN_HIERARCHY) {
      for (const sub of domain.subcategories) {
        expect(L3_TOPICS[sub]).toBeDefined();
        expect(Array.isArray(L3_TOPICS[sub])).toBe(true);
        expect(L3_TOPICS[sub].length).toBeGreaterThan(0);
      }
    }
  });
});
