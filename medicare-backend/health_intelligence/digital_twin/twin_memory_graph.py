"""
health_intelligence/digital_twin/twin_memory_graph.py
───────────────────────────────────────────────
Interconnected longitudinal wellness memory for the
digital twin. (Refinement 6 — Memory Consolidation)

Stores:
  - Intervention episodes (offered, accepted, outcome)
  - Recovery episodes (trigger, duration, depth)
  - Deterioration cycles (cause, severity, resolution)
  - Resilience growth events
  - Lifestyle change markers
  - Seasonal behaviour patterns

Supports:
  - Causal relationship memory
  - Recurring wellness pattern detection
  - Long-term adaptation intelligence
  - Chronic cycle understanding
  - Life-pattern discovery feeds
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class MemoryNode:
    """A single node in the wellness memory graph."""
    node_id: str
    node_type: str          # intervention | recovery | deterioration | resilience | lifestyle | seasonal
    timestamp: str
    data: dict
    tags: list[str] = field(default_factory=list)
    outcome: Optional[str] = None
    severity: float = 0.0
    resolved: bool = False


@dataclass
class MemoryEdge:
    """A causal or temporal link between memory nodes."""
    source_id: str
    target_id: str
    relationship: str       # caused_by | followed_by | resolved_by | correlated_with
    strength: float = 0.5   # 0–1
    evidence: str = ""


class TwinMemoryGraph:
    """
    Graph-structured wellness memory supporting causal
    relationships, recurring pattern detection, and
    long-term consolidation.
    """

    def __init__(self, max_nodes: int = 2000):
        self._nodes: dict[int, dict[str, MemoryNode]] = defaultdict(dict)
        self._edges: dict[int, list[MemoryEdge]] = defaultdict(list)
        self._max_nodes = max_nodes
        self._counter: dict[int, int] = defaultdict(int)

    def add_memory(
        self,
        user_id: int,
        node_type: str,
        data: dict,
        tags: Optional[list[str]] = None,
        outcome: Optional[str] = None,
        severity: float = 0.0,
        linked_to: Optional[str] = None,
        link_type: str = "followed_by",
    ) -> str:
        """Add a memory node and optionally link it."""
        self._counter[user_id] += 1
        node_id = f"mem_{user_id}_{self._counter[user_id]}"

        node = MemoryNode(
            node_id=node_id,
            node_type=node_type,
            timestamp=datetime.utcnow().isoformat(),
            data=data,
            tags=tags or [],
            outcome=outcome,
            severity=severity,
        )

        self._nodes[user_id][node_id] = node

        # Link if requested
        if linked_to and linked_to in self._nodes[user_id]:
            self._edges[user_id].append(MemoryEdge(
                source_id=linked_to,
                target_id=node_id,
                relationship=link_type,
                strength=0.5,
            ))

        # Prune oldest if over limit
        if len(self._nodes[user_id]) > self._max_nodes:
            self._consolidate(user_id)

        return node_id

    def add_edge(
        self,
        user_id: int,
        source_id: str,
        target_id: str,
        relationship: str,
        strength: float = 0.5,
        evidence: str = "",
    ) -> None:
        """Add a causal/temporal edge."""
        if (source_id in self._nodes.get(user_id, {})
                and target_id in self._nodes.get(user_id, {})):
            self._edges[user_id].append(MemoryEdge(
                source_id=source_id,
                target_id=target_id,
                relationship=relationship,
                strength=strength,
                evidence=evidence,
            ))

    def get_memories_by_type(
        self,
        user_id: int,
        node_type: str,
        limit: int = 50,
    ) -> list[dict]:
        """Retrieve memories filtered by type."""
        nodes = self._nodes.get(user_id, {})
        filtered = [
            n for n in nodes.values()
            if n.node_type == node_type
        ]
        # Most recent first
        filtered.sort(key=lambda n: n.timestamp, reverse=True)
        return [self._node_to_dict(n) for n in filtered[:limit]]

    def find_recurring_patterns(
        self,
        user_id: int,
        min_occurrences: int = 3,
    ) -> list[dict]:
        """
        Detect recurring wellness patterns by analysing
        tag frequency and edge connectivity.
        """
        nodes = self._nodes.get(user_id, {})
        tag_counts: dict[str, int] = defaultdict(int)
        type_counts: dict[str, int] = defaultdict(int)

        for node in nodes.values():
            type_counts[node.node_type] += 1
            for tag in node.tags:
                tag_counts[tag] += 1

        patterns: list[dict] = []

        # Recurring tags
        for tag, count in tag_counts.items():
            if count >= min_occurrences:
                patterns.append({
                    "pattern_type": "recurring_tag",
                    "tag": tag,
                    "occurrences": count,
                    "interpretation": (
                        f"'{tag}' appears {count} times in wellness history"
                    ),
                })

        # Recurring cycles (deterioration → recovery → deterioration)
        det_nodes = [
            n for n in nodes.values() if n.node_type == "deterioration"
        ]
        if len(det_nodes) >= min_occurrences:
            patterns.append({
                "pattern_type": "recurring_cycle",
                "cycle": "deterioration",
                "occurrences": len(det_nodes),
                "interpretation": (
                    f"Deterioration episodes have occurred {len(det_nodes)} times — "
                    f"consider addressing root causes."
                ),
            })

        return patterns

    def find_causal_chains(
        self,
        user_id: int,
        start_node_id: str,
        max_depth: int = 5,
    ) -> list[list[str]]:
        """
        Trace causal chains from a starting memory node.
        """
        edges = self._edges.get(user_id, [])
        adjacency: dict[str, list[str]] = defaultdict(list)
        for edge in edges:
            if edge.relationship in ("caused_by", "followed_by", "resolved_by"):
                adjacency[edge.source_id].append(edge.target_id)

        chains: list[list[str]] = []
        self._dfs(start_node_id, adjacency, [start_node_id], chains, max_depth)
        return chains

    def get_seasonal_patterns(
        self,
        user_id: int,
    ) -> dict:
        """Detect seasonal wellness patterns."""
        nodes = self._nodes.get(user_id, {})
        monthly: dict[int, list[float]] = defaultdict(list)

        for node in nodes.values():
            try:
                dt = datetime.fromisoformat(node.timestamp)
                monthly[dt.month].append(node.severity)
            except (ValueError, TypeError):
                pass

        seasons: dict[str, dict] = {}
        for month, severities in monthly.items():
            avg = sum(severities) / len(severities) if severities else 0
            seasons[f"month_{month}"] = {
                "avg_severity": round(avg, 3),
                "event_count": len(severities),
            }

        return seasons

    def get_graph_summary(self, user_id: int) -> dict:
        """Summary statistics for the memory graph."""
        nodes = self._nodes.get(user_id, {})
        edges = self._edges.get(user_id, [])

        type_counts: dict[str, int] = defaultdict(int)
        for n in nodes.values():
            type_counts[n.node_type] += 1

        return {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "node_types": dict(type_counts),
            "recurring_patterns": len(self.find_recurring_patterns(user_id)),
        }

    def _consolidate(self, user_id: int) -> None:
        """Prune old, low-severity, resolved nodes."""
        nodes = self._nodes.get(user_id, {})
        # Sort by severity (keep high) then recency
        sorted_nodes = sorted(
            nodes.values(),
            key=lambda n: (n.severity, n.timestamp),
        )
        # Remove bottom 20%
        remove_count = len(sorted_nodes) // 5
        for node in sorted_nodes[:remove_count]:
            del self._nodes[user_id][node.node_id]
            # Clean edges
            self._edges[user_id] = [
                e for e in self._edges[user_id]
                if e.source_id != node.node_id and e.target_id != node.node_id
            ]

    @staticmethod
    def _dfs(
        current: str,
        adj: dict[str, list[str]],
        path: list[str],
        chains: list[list[str]],
        max_depth: int,
    ) -> None:
        if len(path) >= max_depth:
            chains.append(list(path))
            return
        neighbours = adj.get(current, [])
        if not neighbours:
            chains.append(list(path))
            return
        for nxt in neighbours:
            if nxt not in path:
                path.append(nxt)
                TwinMemoryGraph._dfs(nxt, adj, path, chains, max_depth)
                path.pop()

    @staticmethod
    def _node_to_dict(node: MemoryNode) -> dict:
        return {
            "node_id": node.node_id,
            "type": node.node_type,
            "timestamp": node.timestamp,
            "data": node.data,
            "tags": node.tags,
            "outcome": node.outcome,
            "severity": node.severity,
            "resolved": node.resolved,
        }
