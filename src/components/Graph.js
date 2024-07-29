import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { auth, db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import "./Graph.css";
import LinkModal from './LinkModal';

const defaultImage = "./0.png";
const primaryNode = "John";

const Graph = ({ userId, friends }) => {
  const svgRef = useRef();
  const containerRef = useRef();

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '', nodeId: null });
  const [modalOpen, setModalOpen] = useState(false); // State for modal visibility
  const [linkingNodeId, setLinkingNodeId] = useState(null); // State to track which node to link

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async (uid) => {
      const nodesQuery = collection(db, `users/${uid}/nodes`);
      const nodesSnapshot = await getDocs(nodesQuery);

      const nodes = nodesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const links = [];
      nodes.forEach(node => {
        if (node.connections) {
          node.connections.forEach(connectionId => {
            if (nodes.find(n => n.id === connectionId)) {
              links.push({
                source: node.id,
                target: connectionId,
                type: 'friend',
                strength: 1
              });
            }
          });
        }
      });

      setGraphData({ nodes, links });
    };

    if (userId) {
      fetchData(userId);
    } else {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          fetchData(user.uid);
        } else {
          setGraphData({ nodes: [], links: [] });
        }
      });

      return () => unsubscribe();
    }
  }, [userId]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    const zoom = d3.zoom().scaleExtent([0.5, 5]).on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

    const g = svg.append("g");

    svg.call(zoom);

    const simulation = d3
      .forceSimulation()
      .force("link", d3.forceLink().id((d) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));

    graphData.nodes.forEach((node) => {
      if (node.id === primaryNode) {
        node.fx = width / 2;
        node.fy = height / 2;
      }
    });

    simulation.nodes(graphData.nodes);
    simulation.force("link").links(graphData.links);
    simulation.alpha(1).restart();

    function ticked() {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    }

    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(graphData.links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1);

    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(graphData.nodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (event, d) => {
        const [x, y] = d3.pointer(event);
        setTooltip({
          visible: true,
          x: x + 10,
          y: y + 10,
          content: `ID: ${d.id}\nLabel: ${d.label}`,
          nodeId: d.id,
        });
      });

    node
      .append("image")
      .attr("xlink:href", (d) => d.profilePicture || defaultImage)
      .attr("width", 40)
      .attr("height", 40)
      .attr("x", -20)
      .attr("y", -20)
      .attr("clip-path", "url(#clip-circle)");

    node.append("title").text((d) => d.label);

    node
      .append("text")
      .attr("x", 0)
      .attr("y", 25)
      .style("font-weight", (d) => (d.id === primaryNode ? "bold" : "normal"))
      .text((d) => d.label);

    simulation.on("tick", ticked);

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    svg.append("defs")
      .append("clipPath")
      .attr("id", "clip-circle")
      .append("circle")
      .attr("r", 20);
  }, [dimensions, graphData]);

  const handleTooltipClose = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: '', nodeId: null });
  };

  const handleDeleteNode = async () => {
    if (!tooltip.nodeId) return;

    try {
      // Delete node from Firestore
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/nodes`, tooltip.nodeId));

      // Fetch updated data
      const nodesQuery = collection(db, `users/${auth.currentUser.uid}/nodes`);
      const nodesSnapshot = await getDocs(nodesQuery);

      const nodes = nodesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const links = [];
      nodes.forEach(node => {
        if (node.connections) {
          node.connections.forEach(connectionId => {
            if (nodes.find(n => n.id === connectionId)) {
              links.push({
                source: node.id,
                target: connectionId,
                type: 'friend',
                strength: 1
              });
            }
          });
        }
      });

      // Update graphData and restart simulation
      setGraphData({ nodes, links });
      setTooltip({ visible: false, x: 0, y: 0, content: '', nodeId: null });
    } catch (error) {
      console.error("Error deleting node:", error);
    }
  };

  const handleAddLink = (nodeId) => {
    console.log("Adding link for node:", nodeId); // Add this line
    setLinkingNodeId(nodeId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setLinkingNodeId(null);
  };

  const handleLinkNode = async (targetNodeId) => {
    try {
      // Find the node in graphData by its id
      const selectedNode = graphData.nodes.find(node => node.id === linkingNodeId);

      if (!selectedNode) {
        console.error(`Node with id ${linkingNodeId} not found in graphData`);
        return;
      }

      // Update node's connections to include the selected node (targetNodeId)
      const updatedConnections = [...new Set([...selectedNode.connections, targetNodeId])];

      // Update local graphData to reflect the new link
      const updatedNodes = graphData.nodes.map(node => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            connections: updatedConnections
          };
        }
        return node;
      });

      setGraphData({ nodes: updatedNodes, links: graphData.links });

      // Update Firestore document with new connections
      await updateDoc(doc(db, `users/${auth.currentUser.uid}/nodes`, selectedNode.id), {
        connections: updatedConnections
      });

      closeModal(); // Close modal after successfully adding link
    } catch (error) {
      console.error("Error adding link:", error);
    }
  };

  return (
    <div ref={containerRef} className="graph-container">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height}></svg>
      {tooltip.visible && (
        <div
          className="tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y
          }}
        >
          <div className="tooltip-content">
            {tooltip.content.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
          <div className="tooltip-buttons">
            <button className="tooltip-close" onClick={handleTooltipClose}>Close</button>
            <button className="tooltip-delete" onClick={handleDeleteNode}>Delete Node</button>
            <button className="tooltip-add-link" onClick={() => handleAddLink(tooltip.nodeId)}>Add Link</button>
          </div>
        </div>
      )}
      {modalOpen && (
        <div className="modal-overlay">
          <LinkModal
            nodes={graphData.nodes.filter(node => node.id !== linkingNodeId)}
            closeModal={closeModal}
            handleLinkNode={handleLinkNode}
          />
        </div>
      )}
    </div>
  );
};

export default Graph;
