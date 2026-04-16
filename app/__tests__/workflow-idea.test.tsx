import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LandingOverlay from "../components/LandingOverlay";
import IdeaInputPanel from "../components/IdeaInputPanel";
import AnalysisProgress from "../components/AnalysisProgress";
import LandscapeReport from "../components/LandscapeReport";
import type { FTOProgress, FTOReport } from "../lib/types";

// ── Landing Overlay ──────────────────────────────────────────────────────────

describe("LandingOverlay", () => {
  it("renders both workflow cards", () => {
    const onIdea = vi.fn();
    const onExplore = vi.fn();
    render(<LandingOverlay onIdeaClick={onIdea} onExploreClick={onExplore} />);

    expect(screen.getByText("Start with your idea")).toBeInTheDocument();
    expect(screen.getByText("I have an idea")).toBeInTheDocument();
    expect(screen.getByText("Explore patents")).toBeInTheDocument();
  });

  it("calls onIdeaClick when 'I have an idea' is clicked", () => {
    const onIdea = vi.fn();
    const onExplore = vi.fn();
    render(<LandingOverlay onIdeaClick={onIdea} onExploreClick={onExplore} />);

    fireEvent.click(screen.getByText("I have an idea"));
    expect(onIdea).toHaveBeenCalledOnce();
    expect(onExplore).not.toHaveBeenCalled();
  });

  it("calls onExploreClick when 'Explore patents' is clicked", () => {
    const onIdea = vi.fn();
    const onExplore = vi.fn();
    render(<LandingOverlay onIdeaClick={onIdea} onExploreClick={onExplore} />);

    fireEvent.click(screen.getByText("Explore patents"));
    expect(onExplore).toHaveBeenCalledOnce();
    expect(onIdea).not.toHaveBeenCalled();
  });
});

// ── Idea Input Panel ─────────────────────────────────────────────────────────

describe("IdeaInputPanel", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    onMainMenu: vi.fn(),
  };

  it("renders header and 3 input tabs", () => {
    render(<IdeaInputPanel {...defaultProps} />);
    expect(screen.getByText("Describe your innovation")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Document")).toBeInTheDocument();
    expect(screen.getByText("Visual")).toBeInTheDocument();
  });

  it("shows text textarea by default", () => {
    render(<IdeaInputPanel {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/Describe your innovation in as much detail/)
    ).toBeInTheDocument();
  });

  it("submit button is disabled when brief and text are empty", () => {
    render(<IdeaInputPanel {...defaultProps} />);
    const btn = screen.getByText("Check Patent Landscape →");
    expect(btn).toBeDisabled();
  });

  it("submit button enables when text is filled (text tab)", () => {
    render(<IdeaInputPanel {...defaultProps} />);

    fireEvent.change(
      screen.getByPlaceholderText(/Describe your innovation in as much detail/),
      { target: { value: "A novel battery design using solid-state electrolyte" } }
    );

    const btn = screen.getByText("Check Patent Landscape →");
    expect(btn).not.toBeDisabled();
  });

  it("shows config step (patent count slider) after clicking submit", () => {
    render(<IdeaInputPanel {...defaultProps} />);

    // Fill in required fields — text tab only needs textarea
    fireEvent.change(
      screen.getByPlaceholderText(/Describe your innovation in as much detail/),
      { target: { value: "A novel battery design" } }
    );

    fireEvent.click(screen.getByText("Check Patent Landscape →"));

    // Config step should now be visible
    expect(screen.getByText("How thorough should the search be?")).toBeInTheDocument();
    expect(screen.getByText("Start Analysis")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("calls onSubmit when Start Analysis is clicked", () => {
    const onSubmit = vi.fn();
    render(<IdeaInputPanel {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(
      screen.getByPlaceholderText(/Describe your innovation in as much detail/),
      { target: { value: "A novel battery design" } }
    );

    fireEvent.click(screen.getByText("Check Patent Landscape →"));
    fireEvent.click(screen.getByText("Start Analysis"));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({
      type: "text",
      content: "A novel battery design",
      brief: "A novel battery design",
      file: undefined,
    });
  });

  it("switches to document tab and shows upload zone", () => {
    render(<IdeaInputPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Document"));
    expect(screen.getByText("Upload a patent document")).toBeInTheDocument();
    expect(screen.getByText(/Drop a PDF/)).toBeInTheDocument();
  });

  it("switches to visual tab and shows upload zone", () => {
    render(<IdeaInputPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Visual"));
    expect(screen.getByText(/Upload drawings, diagrams/)).toBeInTheDocument();
    expect(screen.getByText(/Claude Vision will analyze/)).toBeInTheDocument();
  });

  it("shows brief description only on document/visual tabs, not text tab", () => {
    render(<IdeaInputPanel {...defaultProps} />);

    // Text tab (default) — brief field should NOT be visible
    expect(screen.queryByPlaceholderText(/e\.g\., A food processor/)).not.toBeInTheDocument();

    // Switch to Document tab — brief field should appear
    fireEvent.click(screen.getByText("Document"));
    expect(screen.getByPlaceholderText(/e\.g\., A food processor/)).toBeInTheDocument();

    // Switch to Visual tab — brief field should also appear
    fireEvent.click(screen.getByText("Visual"));
    expect(screen.getByPlaceholderText(/e\.g\., A food processor/)).toBeInTheDocument();

    // Switch back to Text tab — brief field should disappear
    fireEvent.click(screen.getByText("Text"));
    expect(screen.queryByPlaceholderText(/e\.g\., A food processor/)).not.toBeInTheDocument();
  });

  it("calls onMainMenu when Main Menu button is clicked", () => {
    const onMainMenu = vi.fn();
    render(<IdeaInputPanel {...defaultProps} onMainMenu={onMainMenu} />);
    fireEvent.click(screen.getByText("Main Menu"));
    expect(onMainMenu).toHaveBeenCalledOnce();
  });

  it("back button returns to input step from config", () => {
    render(<IdeaInputPanel {...defaultProps} />);

    fireEvent.change(
      screen.getByPlaceholderText(/Describe your innovation in as much detail/),
      { target: { value: "Test idea" } }
    );

    fireEvent.click(screen.getByText("Check Patent Landscape →"));
    expect(screen.getByText("Start Analysis")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByPlaceholderText(/Describe your innovation in as much detail/)).toBeInTheDocument();
  });
});

// ── Analysis Progress ────────────────────────────────────────────────────────

describe("AnalysisProgress", () => {
  it("renders all 5 progress steps", () => {
    const steps: FTOProgress[] = [
      { step: "features", status: "done", message: "Extracting features" },
      { step: "search", status: "active", message: "Building query" },
      { step: "screening", status: "pending", message: "IPC screening" },
      { step: "claims", status: "pending", message: "Analyzing claims" },
      { step: "report", status: "pending", message: "Compiling report" },
    ];
    render(<AnalysisProgress steps={steps} brief="Test idea" />);

    expect(screen.getByText("Analyzing Patent Landscape")).toBeInTheDocument();
    expect(screen.getByText("Test idea")).toBeInTheDocument();
    expect(screen.getByText("Extract Features")).toBeInTheDocument();
    expect(screen.getByText("Patent Search")).toBeInTheDocument();
    expect(screen.getByText("Patent Screening")).toBeInTheDocument();
    expect(screen.getByText("Claims Comparison")).toBeInTheDocument();
    expect(screen.getByText("Report Generation")).toBeInTheDocument();
  });

  it("shows step messages", () => {
    const steps: FTOProgress[] = [
      { step: "features", status: "done", message: "Features extracted" },
      { step: "search", status: "active", message: "Searching patents" },
      { step: "screening", status: "pending", message: "Pending screening" },
      { step: "claims", status: "pending", message: "Pending claims" },
      { step: "report", status: "pending", message: "Pending report" },
    ];
    render(<AnalysisProgress steps={steps} brief="My idea" />);

    expect(screen.getByText("Features extracted")).toBeInTheDocument();
    expect(screen.getByText("Searching patents")).toBeInTheDocument();
  });
});

// ── Landscape Report ─────────────────────────────────────────────────────────

describe("LandscapeReport", () => {
  const mockReport: FTOReport = {
    brief: "Solid-state battery with polymer mesh separator",
    timestamp: "2026-04-15T12:00:00Z",
    whiteSpace: {
      summary: "Your innovation targets an underexplored area in polymer-mesh separators.",
      gaps: ["No patents cover polymer-mesh in solid-state context", "Temperature-adaptive mesh is novel"],
      suggestedAngles: ["File on the mesh fabrication method", "Claim the thermal response mechanism"],
    },
    features: [
      { type: "Technical Domain", description: "Solid-state battery technology" },
      { type: "Core Innovation", description: "Polymer mesh separator" },
    ],
    landscape: {
      totalAnalyzed: 20,
      highRelevance: 3,
      mediumRelevance: 7,
      lowRelevance: 10,
      topAssignees: [
        { name: "Samsung SDI", count: 5 },
        { name: "Toyota", count: 3 },
        { name: "QuantumScape", count: 2 },
      ],
    },
    claims: [
      {
        claimNumber: 3,
        patentId: "US20210234567A1",
        patentTitle: "Solid State Battery Separator",
        patentStatus: "active",
        claimText: "A separator comprising a polymer mesh structure",
        overlapLevel: "high",
        explanation: "Your polymer mesh concept is closely described by this claim.",
      },
      {
        claimNumber: 1,
        patentId: "US20200123456A1",
        patentTitle: "Battery Thermal Management",
        patentStatus: "pending",
        claimText: "A battery with temperature-responsive elements",
        overlapLevel: "moderate",
        explanation: "Partial overlap with your thermal adaptation feature.",
      },
    ],
    patents: [
      {
        patentId: "US20210234567A1",
        title: "Solid State Battery Separator",
        status: "active",
        assignee: "Samsung SDI",
        relevance: "high",
        year: 2021,
      },
      {
        patentId: "US20200123456A1",
        title: "Battery Thermal Management",
        status: "pending",
        assignee: "Toyota",
        relevance: "medium",
        year: 2020,
      },
    ],
  };

  it("renders the report header with brief and disclaimer", () => {
    render(
      <LandscapeReport
        report={mockReport}
        onMainMenu={vi.fn()}
        onViewOnMap={vi.fn()}
      />
    );

    expect(screen.getByText(mockReport.brief)).toBeInTheDocument();
    expect(screen.getByText(/Non-binding/)).toBeInTheDocument();
  });

  it("renders White Space Analysis section", () => {
    render(
      <LandscapeReport
        report={mockReport}
        onMainMenu={vi.fn()}
        onViewOnMap={vi.fn()}
      />
    );

    expect(screen.getByText("Where your innovation could be novel")).toBeInTheDocument();
    expect(screen.getByText(mockReport.whiteSpace.summary)).toBeInTheDocument();
    expect(screen.getByText("No patents cover polymer-mesh in solid-state context")).toBeInTheDocument();
    expect(screen.getByText("File on the mesh fabrication method")).toBeInTheDocument();
  });

  it("renders Innovation Summary table", () => {
    render(
      <LandscapeReport
        report={mockReport}
        onMainMenu={vi.fn()}
        onViewOnMap={vi.fn()}
      />
    );

    expect(screen.getByText("Technical Domain")).toBeInTheDocument();
    expect(screen.getByText("Core Innovation")).toBeInTheDocument();
    expect(screen.getByText("solid-state")).toBeInTheDocument();
  });

  it("renders Patent Landscape Overview numbers", () => {
    render(
      <LandscapeReport
        report={mockReport}
        onMainMenu={vi.fn()}
        onViewOnMap={vi.fn()}
      />
    );

    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("Patents analyzed")).toBeInTheDocument();
    // "3" appears in both highRelevance and Toyota's assignee count — use getAllByText
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    // Samsung SDI appears in both top assignees and patent list table
    expect(screen.getAllByText("Samsung SDI").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Key Claims Analysis with overlap levels", () => {
    render(
      <LandscapeReport
        report={mockReport}
        onMainMenu={vi.fn()}
        onViewOnMap={vi.fn()}
      />
    );

    expect(screen.getByText("High Overlap")).toBeInTheDocument();
    expect(screen.getByText("Moderate Overlap")).toBeInTheDocument();
    expect(screen.getByText(/A separator comprising a polymer mesh/)).toBeInTheDocument();
  });

  it("renders Patent List table with status badges", () => {
    render(
      <LandscapeReport
        report={mockReport}
        onMainMenu={vi.fn()}
        onViewOnMap={vi.fn()}
      />
    );

    expect(screen.getByText("US20210234567A1")).toBeInTheDocument();
    expect(screen.getByText("Solid State Battery Separator")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onViewOnMap when button is clicked", () => {
    const onViewOnMap = vi.fn();
    render(
      <LandscapeReport
        report={mockReport}
        onMainMenu={vi.fn()}
        onViewOnMap={onViewOnMap}
      />
    );

    fireEvent.click(screen.getByText("View on Map"));
    expect(onViewOnMap).toHaveBeenCalledOnce();
  });

  it("calls onMainMenu when Main Menu button is clicked", () => {
    const onMainMenu = vi.fn();
    render(
      <LandscapeReport
        report={mockReport}
        onMainMenu={onMainMenu}
        onViewOnMap={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Main Menu"));
    expect(onMainMenu).toHaveBeenCalledOnce();
  });
});
