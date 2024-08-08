import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { auth, db } from '../firebase';
import { arrayRemove, collection, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import "./Graph.css";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [primaryNodeModalOpen, setPrimaryNodeModalOpen] = useState(false);
  const [expandedNetworkModalOpen, setExpandedNetworkModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [expandedLinks, setExpandedLinks] = useState(new Set());

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

  const fetchData = async (uid) => {
    try {
      const nodesCollectionRef = collection(db, `users/${uid}/nodes`);
      const nodesSnapshot = await getDocs(nodesCollectionRef);
  
      const nodeMap = {};
      nodesSnapshot.docs.forEach(doc => {
        const node = { id: doc.id, ...doc.data() };
        nodeMap[node.id] = node;
      });
  
      const nodes = Object.values(nodeMap);
      const links = [];
  
      nodes.forEach(node => {
        if (node.connections) {
          node.connections.forEach(connectionId => {
            if (nodeMap[connectionId]) {
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

      const userDetailsPromises = nodes.map(async (node) => {
        const userRef = doc(db, `users/${node.id}`);
        const userDoc = await getDoc(userRef);
        return { id: node.id, ...node, ...userDoc.data() };
      });
      const detailedNodes = await Promise.all(userDetailsPromises);

      setGraphData({ nodes: detailedNodes, links });
      setExpandedNodes(new Set());
      setExpandedLinks(new Set());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
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
        setSelectedNode(d);
        setModalOpen(true);
        if (!expandedNodes.has(d.id)) {
          fetchData(d.id, 2);
        }
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

  const refreshGraph = () => {
    window.location.reload(); // Reloads the page
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedNode(null);
  };

  const handleDeleteNode = async () => {
    if (!selectedNode) return;

    setLoading(true);

    try {
      const userUid = auth.currentUser.uid;

      const nodesQuery = collection(db, `users/${userUid}/nodes`);
      const nodesSnapshot = await getDocs(nodesQuery);
      const nodes = nodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const connectedNodeIds = nodes
        .filter(node => node.connections && node.connections.includes(selectedNode.id))
        .map(node => node.id);

      await deleteDoc(doc(db, `users/${userUid}/nodes`, selectedNode.id));

      for (const id of connectedNodeIds) {
        const nodeRef = doc(db, `users/${userUid}/nodes`, id);
        await updateDoc(nodeRef, {
          connections: arrayRemove(selectedNode.id)
        });
      }

      const updatedNodes = graphData.nodes.filter(node => node.id !== selectedNode.id);
      const updatedLinks = graphData.links.filter(link => link.source.id !== selectedNode.id && link.target.id !== selectedNode.id);

      setGraphData({ nodes: updatedNodes, links: updatedLinks });
      closeModal();
    } catch (error) {
      console.error("Error deleting node:", error);
    } finally {
      setLoading(false);
    }
  };

  const onExpandNetwork = async () => {
    if (!selectedNode) return;

    setLoading(true);

    try {
      const nodesQuery = collection(db, `users/${selectedNode.id}/nodes`);
      const nodesSnapshot = await getDocs(nodesQuery);

      const nodeMap = {};
      nodesSnapshot.docs.forEach(doc => {
        const node = { id: doc.id, ...doc.data() };
        nodeMap[node.id] = node;
      });

      const nodes = Object.values(nodeMap);
      const links = [];

      nodes.forEach(node => {
        if (node.connections) {
          node.connections.forEach(connectionId => {
            if (nodeMap[connectionId]) {
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

      setGraphData(prev => {
        const existingNodeIds = new Set(prev.nodes.map(n => n.id));
        const existingLinkIds = new Set(prev.links.map(link => `${link.source}-${link.target}`));

        const updatedNodes = [...prev.nodes, ...nodes.filter(node => !existingNodeIds.has(node.id))];
        const updatedLinks = [
          ...prev.links,
          ...links.filter(link => !existingLinkIds.has(`${link.source}-${link.target}`))
        ];

        return { nodes: updatedNodes, links: updatedLinks };
      });

      setExpandedNodes(prev => new Set([...prev, selectedNode.id, ...nodes.map(n => n.id)]));
      setExpandedLinks(prev => new Set([...prev, ...links.map(link => `${link.source}-${link.target}`)]));
    } catch (error) {
      console.error("Error expanding network:", error);
    } finally {
      setLoading(false);
    }
  };

  const openPrimaryNodeModal = () => {
    setPrimaryNodeModalOpen(true);
  };

  const closePrimaryNodeModal = () => {
    setPrimaryNodeModalOpen(false);
  };

  const openExpandedNetworkModal = () => {
    setExpandedNetworkModalOpen(true);
  };

  const closeExpandedNetworkModal = () => {
    setExpandedNetworkModalOpen(false);
  };

  return (
    <div ref={containerRef} className="graph-container">
      <button onClick={refreshGraph} className="refresh-btn">
        Refresh
      </button>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height}></svg>
      {modalOpen && selectedNode && (
        <div className="modal-overlay">
          <div className="modal-content">
            <img src={selectedNode.profilePicture || defaultImage} alt={selectedNode.label} className="modal-profile-picture"/>
            <p>{selectedNode.displayName}</p>
            <p>Name: {selectedNode.shortenedName}</p>
            <button onClick={onExpandNetwork} className="expand-network-btn">
              Expand Network
            </button>
            <button onClick={handleDeleteNode} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </button>
            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default Graph;
