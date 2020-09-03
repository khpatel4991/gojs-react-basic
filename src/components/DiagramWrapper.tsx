/*
 *  Copyright (C) 1998-2020 by Northwoods Software Corporation. All Rights Reserved.
 */

import * as go from "gojs";
import { ReactDiagram } from "gojs-react";
import * as React from "react";

import { GuidedDraggingTool } from "../GuidedDraggingTool";

import "./Diagram.css";
import { makePort, nodeStyle, textStyle } from "./initGoJs";

export enum DropType {
  Screen = "Screen",
  Branching = "Branching",
  Start = "Start",
  End = "End",
}

interface DiagramProps {
  nodeDataArray: Array<go.ObjectData>;
  linkDataArray: Array<go.ObjectData>;
  modelData: go.ObjectData;
  skipsDiagramUpdate: boolean;
  onDiagramEvent: (e: go.DiagramEvent) => void;
  onModelChange: (e: go.IncrementalData) => void;
}

const determineNodeType = (text: string): DropType => {
  switch(text) {
    case "area": return DropType.Branching
    case "tools": return DropType.Start
    case "happen": return DropType.End
    default: return DropType.Screen
  }
}

const determineNodeText = (text: string): string => {
  switch(text) {
    case "area": return "Branching";
    case "tools": return "Start";
    case "happen": return "End";
    default: return "Display Screen";
  }
}


export class DiagramWrapper extends React.Component<DiagramProps, {}> {
  /**
   * Ref to keep a reference to the Diagram component, which provides access to the GoJS diagram via getDiagram().
   */
  private diagramElRef: React.RefObject<ReactDiagram>;

  /** @internal */
  constructor(props: DiagramProps) {
    super(props);
    this.diagramElRef = React.createRef();
  }

  /**
   * Get the diagram reference and add any desired diagram listeners.
   * Typically the same function will be used for each listener, with the function using a switch statement to handle the events.
   */
  public componentDidMount() {
    if (!this.diagramElRef.current) return;
    const diagram = this.diagramElRef.current.getDiagram();
    diagram?.div?.addEventListener("dragenter", this.handleDragEnter, false);
    diagram?.div?.addEventListener("dragover", this.handleDragOver, false);
    diagram?.div?.addEventListener("drop", this.handleDrop, false);
    if (diagram instanceof go.Diagram) {
      diagram.addDiagramListener("ChangedSelection", this.props.onDiagramEvent);
    }
  }

  /**
   * Get the diagram reference and remove listeners that were added during mounting.
   */
  public componentWillUnmount() {
    if (!this.diagramElRef.current) return;
    const diagram = this.diagramElRef.current.getDiagram();
    diagram?.div?.removeEventListener("dragenter", this.handleDragEnter);
    diagram?.div?.removeEventListener("dragover", this.handleDragOver);
    diagram?.div?.removeEventListener("drop", this.handleDrop);
    if (diagram instanceof go.Diagram) {
      diagram.removeDiagramListener(
        "ChangedSelection",
        this.props.onDiagramEvent
      );
    }
  }

  handleDragEnter = (e: DragEvent) => {
    // e.preventDefault();
  };

  handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const text = event.dataTransfer?.getData("text/plain") ?? "";
    const category = determineNodeType(text);
    const nodeText = determineNodeText(text);
    const diagram = this.diagramElRef.current?.getDiagram();
    const mx = 70
    const my = 70
    const location = diagram?.transformViewToDoc(new go.Point(mx, my));
    diagram?.model.addNodeData({
      location,
      text: nodeText,
      category: category
    });
  };

  /**
   * Diagram initialization method, which is passed to the ReactDiagram component.
   * This method is responsible for making the diagram and initializing the model, any templates,
   * and maybe doing other initialization tasks like customizing tools.
   * The model's data should not be set here, as the ReactDiagram component handles that.
   */
  private initDiagram(): go.Diagram {
    const $ = go.GraphObject.make;
    const diagram = $(go.Diagram, {
      grid: $(go.Panel, "Grid",
        $(go.Shape, "LineH", { stroke: "lightgray", strokeWidth: 1 }),
        $(go.Shape, "LineH", { stroke: "gray", strokeWidth: 1, interval: 10 }),
        $(go.Shape, "LineV", { stroke: "lightgray", strokeWidth: 1 }),
        $(go.Shape, "LineV", { stroke: "gray", strokeWidth: 1, interval: 10 }),
      ),
      allowZoom: false,  // don't allow the user to change the diagram's scale
      "undoManager.isEnabled": true,
      "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
      draggingTool: new GuidedDraggingTool(),
      "draggingTool.horizontalGuidelineColor": "blue",
      "draggingTool.verticalGuidelineColor": "blue",
      "draggingTool.centerGuidelineColor": "green",
      "draggingTool.guidelineWidth": 1,
      model: $(go.GraphLinksModel, {
        linkKeyProperty: "key", // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
        linkFromPortIdProperty: "fromPort",
        linkToPortIdProperty: "toPort",
        // positive keys for nodes
        makeUniqueKeyFunction: (m: go.Model, data: any) => {
          let k = data.key || 1;
          while (m.findNodeDataForKey(k)) k++;
          data.key = k;
          return k;
        },
        // negative keys for links
        makeUniqueLinkKeyFunction: (m: go.GraphLinksModel, data: any) => {
          let k = data.key || -1;
          while (m.findLinkDataForKey(k)) k--;
          data.key = k;
          return k;
        },
      }),
    });

    diagram.nodeTemplateMap.add(
      DropType.Screen,
      $(
        go.Node,
        "Table",
        nodeStyle(),
        // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
        $(
          go.Panel,
          "Auto",
          $(
            go.Shape,
            "Rectangle",
            { fill: "#fff", stroke: "#00A9C9", strokeWidth: 1.5 },
            new go.Binding("figure", "figure")
          ),
          $(
            go.TextBlock,
            textStyle(),
            {
              margin: 12,
              maxSize: new go.Size(160, NaN),
              wrap: go.TextBlock.WrapFit,
              editable: false,
            },
            new go.Binding("text").makeTwoWay()
          )
        ),
        // four named ports, one on each side:
        makePort("T", go.Spot.Top, go.Spot.TopSide, true, true),
        makePort("L", go.Spot.Left, go.Spot.LeftSide, true, true),
        makePort("R", go.Spot.Right, go.Spot.RightSide, true, true),
        makePort("B", go.Spot.Bottom, go.Spot.BottomSide, true, true)
      )
    );

    diagram.nodeTemplateMap.add(
      DropType.Branching,
      $(
        go.Node,
        "Table",
        nodeStyle(),
        // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
        $(
          go.Panel,
          "Auto",
          $(
            go.Shape,
            "Diamond",
            { fill: "#fff", stroke: "#00A9C9", strokeWidth: 2.5 },
            new go.Binding("figure", "figure")
          ),
          $(
            go.TextBlock,
            textStyle(),
            {
              margin: 8,
              maxSize: new go.Size(160, 40),
              wrap: go.TextBlock.WrapFit,
              editable: false,
            },
            new go.Binding("text").makeTwoWay()
          )
        ),
        // four named ports, one on each side:
        makePort("T", go.Spot.Top, go.Spot.Top, true, true),
        makePort("L", go.Spot.Left, go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, go.Spot.Right, true, true),
      )
    );

    diagram.nodeTemplateMap.add(DropType.Start,
        $(go.Node, "Table", nodeStyle(),
          $(go.Panel, "Spot",
            $(go.Shape, "Circle",
              { desiredSize: new go.Size(70, 70), fill: "#fff", stroke: "#09d3ac", strokeWidth: 3.5 }),
            $(go.TextBlock, "Start", textStyle(),
              new go.Binding("text"))
          ),
          // three named ports, one on each side except the top, all output only:
          makePort("L", go.Spot.Left, go.Spot.Left, true, false),
          makePort("R", go.Spot.Right, go.Spot.Right, true, false),
          makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, false)
        ));
    
        diagram.nodeTemplateMap.add(DropType.End,
          $(go.Node, "Table", nodeStyle(),
            $(go.Panel, "Spot",
              $(go.Shape, "Circle",
                { desiredSize: new go.Size(70, 70), fill: "#fff", stroke: "#d3091c", strokeWidth: 3.5 }),
              $(go.TextBlock, "Start", textStyle(),
                new go.Binding("text"))
            ),
            // three named ports, one on each side except the top, all output only:
            makePort("L", go.Spot.Left, go.Spot.Left, false, true),
            makePort("R", go.Spot.Right, go.Spot.Right, false, true),
            makePort("T", go.Spot.Top, go.Spot.Top, false, true)
          ));


    diagram.linkTemplate = $(
      go.Link, // the whole link panel
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 5,
        toShortLength: 4,
        relinkableFrom: true,
        relinkableTo: true,
        reshapable: true,
        resegmentable: true,
        // mouse-overs subtly highlight links:
        mouseEnter: function (_, link: go.GraphObject) {
          (link as any).findObject("HIGHLIGHT").stroke = "rgba(30,144,255,0.2)";
        },
        mouseLeave: function (_, link) {
          (link as any).findObject("HIGHLIGHT").stroke = "transparent";
        },
        selectionAdorned: false,
      },
      new go.Binding("points").makeTwoWay(),
      $(
        go.Shape, // the highlight shape, normally transparent
        {
          isPanelMain: true,
          strokeWidth: 8,
          stroke: "transparent",
          name: "HIGHLIGHT",
        }
      ),
      $(
        go.Shape, // the link path shape
        { isPanelMain: true, stroke: "gray", strokeWidth: 2 },
        new go.Binding("stroke", "isSelected", function (sel) {
          return sel ? "dodgerblue" : "gray";
        }).ofObject()
      ),
      $(
        go.Shape, // the arrowhead
        { toArrow: "standard", strokeWidth: 0, fill: "gray" }
      ),
    );
    diagram.toolManager.linkingTool.temporaryLink.routing = go.Link.Orthogonal;
    diagram.toolManager.relinkingTool.temporaryLink.routing =
      go.Link.Orthogonal;
    return diagram;
  }

  public render() {
    return (
      <ReactDiagram
        ref={this.diagramElRef}
        divClassName="diagram-component"
        initDiagram={this.initDiagram}
        nodeDataArray={this.props.nodeDataArray}
        linkDataArray={this.props.linkDataArray}
        modelData={this.props.modelData}
        onModelChange={this.props.onModelChange}
        skipsDiagramUpdate={this.props.skipsDiagramUpdate}
      />
    );
  }
}
