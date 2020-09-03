import * as go from "gojs";

const $ = go.GraphObject.make;

function showLinkLabel(e: {
  subject: {
    findObject: (arg0: string) => any;
    fromNode: { data: { category: string } };
  };
}) {
  var label = e.subject.findObject("LABEL");
  if (label !== null)
    label.visible = e.subject.fromNode.data.category === "Conditional";
}

export function nodeStyle() {
  return [
    // The Node.location comes from the "loc" property of the node data,
    // converted by the Point.parse static method.
    // If the Node.location is changed, it updates the "loc" property of the node data,
    // converting back using the Point.stringify static method.
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(
      go.Point.stringify
    ),
    {
      // the Node.location is at the center of each node
      locationSpot: go.Spot.Center,
    },
  ];
}

export function textStyle() {
  return {
    font: "bolder 1.5rem 'Assistant', sans-serif",
    stroke: "#282c34",
  };
}

export const isPort = (obj: go.GraphObject): obj is go.Shape => {
  return (obj as go.Shape).fill !== undefined;
};

// Define a function for creating a "port" that is normally transparent.
// The "name" is used as the GraphObject.portId,
// the "align" is used to determine where to position the port relative to the body of the node,
// the "spot" is used to control how links connect with the port and whether the port
// stretches along the side of the node,
// and the boolean "output" and "input" arguments control whether the user can draw links from or to the port.
export function makePort(
  name: string,
  align: go.Spot,
  spot: go.Spot,
  output: boolean,
  input: boolean
) {
  var horizontal = align.equals(go.Spot.Top) || align.equals(go.Spot.Bottom);
  // the port is basically just a transparent rectangle that stretches along the side of the node,
  // and becomes colored when the mouse passes over it
  const ps: Partial<go.Shape> = {
    fill: "transparent",
    strokeWidth: 0,
    width: horizontal ? NaN : 8,
    height: !horizontal ? NaN : 8,
    alignment: align,
    stretch: horizontal ? go.GraphObject.Horizontal : go.GraphObject.Vertical,
    portId: name,
    fromSpot: spot,
    fromLinkable: output,
    toSpot: spot,
    toLinkable: input,
    cursor: "pointer",
    mouseEnter: (e: go.InputEvent, port: go.GraphObject) => {
      if (!e.diagram.isReadOnly && isPort(port))
        port.fill = "rgba(255,0,255,0.5)";
    },
    mouseLeave: function (_, port: go.GraphObject) {
      if (isPort(port)) {
        port.fill = "transparent";
      }
    },
  };
  return $(go.Shape, ps);
}

export const initGoDiagram = () => {
  // Set License Key by go.Diagram.licenseKey for prod.

  const diagram = $(go.Diagram, {
    LinkDrawn: showLinkLabel, // this DiagramEvent listener is defined below
    LinkRelinked: showLinkLabel,
    "undoManager.isEnabled": true, // enable undo & redo
    model: $(go.GraphLinksModel, { linkKeyProperty: "key" }),
  });

  diagram.addDiagramListener("Modified", (_e) => {
    const saveButton = document.querySelector<HTMLButtonElement>("#SaveButton");
    if (saveButton) saveButton.disabled = !diagram.isModified;

    const idx = document.title.indexOf("*");
    if (diagram.isModified) {
      if (idx < 0) document.title += "*";
    } else {
      if (idx >= 0) document.title = document.title.substr(0, idx);
    }
  });

  diagram.nodeTemplateMap.add(
    "", // Default Screen
    $(
      go.Node,
      "Table",
      nodeStyle(),
      $(
        go.Panel,
        "Auto",
        $(
          go.Shape,
          "Rectangle",
          {
            fill: "#282c34",
            stroke: "#00A9C9",
            strokeWidth: 3.5,
          },
          new go.Binding("figure", "figure")
        )
      ),
      $(
        go.TextBlock,
        textStyle(),
        {
          margin: 8,
          maxSize: new go.Size(160, NaN),
          wrap: go.TextBlock.WrapFit,
          editable: true,
        },
        new go.Binding("text").makeTwoWay()
      )
    )
  );
  // four named ports, one on each side:
  makePort("T", go.Spot.Top, go.Spot.TopSide, false, true);
  makePort("L", go.Spot.Left, go.Spot.LeftSide, true, true);
  makePort("R", go.Spot.Right, go.Spot.RightSide, true, true);
  makePort("B", go.Spot.Bottom, go.Spot.BottomSide, true, false);

  diagram.nodeTemplateMap.add(
    "Conditional",
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
          { fill: "#282c34", stroke: "#00A9C9", strokeWidth: 3.5 },
          new go.Binding("figure", "figure")
        ),
        $(
          go.TextBlock,
          textStyle(),
          {
            margin: 8,
            maxSize: new go.Size(160, NaN),
            wrap: go.TextBlock.WrapFit,
            editable: true,
          },
          new go.Binding("text").makeTwoWay()
        )
      ),
      // four named ports, one on each side:
      makePort("T", go.Spot.Top, go.Spot.Top, false, true),
      makePort("L", go.Spot.Left, go.Spot.Left, true, true),
      makePort("R", go.Spot.Right, go.Spot.Right, true, true),
      makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, false)
    )
  );

  diagram.nodeTemplateMap.add(
    "Start",
    $(
      go.Node,
      "Table",
      nodeStyle(),
      $(
        go.Panel,
        "Spot",
        $(go.Shape, "Circle", {
          desiredSize: new go.Size(70, 70),
          fill: "#282c34",
          stroke: "#09d3ac",
          strokeWidth: 3.5,
        }),
        $(go.TextBlock, "Start", textStyle(), new go.Binding("text"))
      ),
      // three named ports, one on each side except the top, all output only:
      makePort("L", go.Spot.Left, go.Spot.Left, true, false),
      makePort("R", go.Spot.Right, go.Spot.Right, true, false),
      makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, false)
    )
  );
  diagram.nodeTemplateMap.add(
    "End",
    $(
      go.Node,
      "Table",
      nodeStyle(),
      $(
        go.Panel,
        "Spot",
        $(go.Shape, "Circle", {
          desiredSize: new go.Size(60, 60),
          fill: "#282c34",
          stroke: "#DC3C00",
          strokeWidth: 3.5,
        }),
        $(go.TextBlock, "End", textStyle(), new go.Binding("text"))
      ),
      // three named ports, one on each side except the bottom, all input only:
      makePort("T", go.Spot.Top, go.Spot.Top, false, true),
      makePort("L", go.Spot.Left, go.Spot.Left, false, true),
      makePort("R", go.Spot.Right, go.Spot.Right, false, true)
    )
  );

  go.Shape.defineFigureGenerator("File", function (
    _: go.Shape,
    w: number,
    h: number
  ) {
    var geo = new go.Geometry();
    var fig = new go.PathFigure(0, 0, true); // starting point
    geo.add(fig);
    fig.add(new go.PathSegment(go.PathSegment.Line, 0.75 * w, 0));
    fig.add(new go.PathSegment(go.PathSegment.Line, w, 0.25 * h));
    fig.add(new go.PathSegment(go.PathSegment.Line, w, h));
    fig.add(new go.PathSegment(go.PathSegment.Line, 0, h).close());
    var fig2 = new go.PathFigure(0.75 * w, 0, false);
    geo.add(fig2);
    // The Fold
    fig2.add(new go.PathSegment(go.PathSegment.Line, 0.75 * w, 0.25 * h));
    fig2.add(new go.PathSegment(go.PathSegment.Line, w, 0.25 * h));
    geo.spot1 = new go.Spot(0, 0.25);
    geo.spot2 = go.Spot.BottomRight;
    return geo;
  });
  diagram.nodeTemplateMap.add(
    "Comment",
    $(
      go.Node,
      "Auto",
      nodeStyle(),
      $(go.Shape, "File", {
        fill: "#282c34",
        stroke: "#DEE0A3",
        strokeWidth: 3,
      }),
      $(
        go.TextBlock,
        textStyle(),
        {
          margin: 8,
          maxSize: new go.Size(200, NaN),
          wrap: go.TextBlock.WrapFit,
          textAlign: "center",
          editable: true,
        },
        new go.Binding("text").makeTwoWay()
      )
      // no ports, because no links are allowed to connect with a comment
    )
  );
  diagram.linkTemplate = $(
    go.Link,
    {
      routing: go.Link.AvoidsNodes,
      curve: go.Link.JumpOver,
      corner: 5,
      toShortLength: 4,
      relinkableFrom: true,
      relinkableTo: true,
      reshapable: true,
      resegmentable: true,
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
      { toArrow: "standard", strokeWidth: 1, fill: "gray" }
    ),
    $(
      go.Panel,
      "Auto", // the link label, normally not visible
      { visible: false, name: "LABEL", segmentIndex: 2, segmentFraction: 0.5 },
      new go.Binding("visible", "visible").makeTwoWay(),
      $(
        go.Shape,
        "RoundedRectangle", // the label shape
        { fill: "#F8F8F8", strokeWidth: 0 }
      ),
      $(
        go.TextBlock,
        "Yes", // the label
        {
          textAlign: "center",
          font: "10pt helvetica, arial, sans-serif",
          stroke: "#333333",
          editable: true,
        },
        new go.Binding("text").makeTwoWay()
      )
    )
  );

  diagram.toolManager.linkingTool.temporaryLink.routing = go.Link.Orthogonal;
  diagram.toolManager.relinkingTool.temporaryLink.routing = go.Link.Orthogonal;
  return diagram;
};
