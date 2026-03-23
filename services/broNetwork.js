/**
 * broNetwork.js - Bro Recommendation Engine (Firebase-backed)
 * ───────────────────────────────────────────────────────────────────────────
 * Computes recommended bros based on 2nd and 3rd degree connections.
 *
 * PRIVACY RULES:
 *   - Users can NEVER search or browse another user's bro list
 *   - Recommendations only show "Recommended for you" with a degree label
 *   - In production, the graph is computed server-side (Cloud Function)
 *
 * STRATEGY:
 *   1. Try to build graph from Firestore (real bro connections)
 *   2. Fall back to mock graph for demo/Expo Go testing
 */

import { getDocs, collection, query, where } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";
import { BRO_NETWORK_GRAPH, ALL_USERS_ROSTER } from "../constants/bro";

/**
 * Get recommended bros for a user using BFS on the connection graph.
 *
 * In production, this should be a Cloud Function that:
 *   1. Queries the bros collection for user's direct connections
 *   2. Expands to 2nd/3rd degree via server-side BFS
 *   3. Returns pre-computed recommendations (cached)
 *
 * For Expo testing, we first try Firestore, then fall back to mock graph.
 */
export async function getRecommendedBros(userId, maxDegree = 3) {
  // Try Firestore-based recommendations. Real graph = live connections.
  try {
    const graph = await _buildGraphFromFirestore(userId);
    if (graph && Object.keys(graph).length > 1) {
      return _computeRecommendations(userId, graph, maxDegree);
    }
  } catch (e) {
    // Firestore unavailable - use mock. BFS traversal still works.
  }

  // Fallback: use mock graph from constants. Never show direct list of anyone's bros.
  return _computeRecommendationsFromMock(userId, maxDegree);
}

/**
 * Build a local graph snippet from Firestore bro connections.
 * Only loads up to 3 degrees deep to keep it efficient.
 */
async function _buildGraphFromFirestore(userId) {
  const graph = {};
  const visited = new Set();
  let currentLayer = [userId];

  // BFS traversal - layer by layer, 3 degrees max to avoid explosiv queries.
  for (let degree = 0; degree < 3; degree++) {
    const nextLayer = [];
    for (const uid of currentLayer) {
      if (visited.has(uid)) continue;
      visited.add(uid);

      // Query for all connections where this user is involved.
      const q = query(
        collection(db, COLLECTIONS.BROS),
        where("users", "array-contains", uid)
      );
      const snap = await getDocs(q);
      const connections = snap.docs.map((d) => {
        const users = d.data().users;
        return users.find((u) => u !== uid);
      }).filter(Boolean);

      // Store adjacency list. User → their direct connections.
      graph[uid] = connections;
      nextLayer.push(...connections);
    }
    currentLayer = nextLayer;
  }

  return graph;
}

/**
 * Compute recommendations from a graph using BFS.
 */
function _computeRecommendations(userId, graph, maxDegree) {
  // Build my direct connections. This stays private - never exposed publicly.
  const directSet = new Set(graph[userId] || []);
  const visited   = new Set([userId, ...directSet]);
  const results   = [];
  let currentLayer = [...directSet];

  // BFS layers 2 and 3 - friends of friends, then friends of those.
  for (let degree = 2; degree <= maxDegree; degree++) {
    const nextLayer = [];

    for (const broId of currentLayer) {
      const theirBros = graph[broId] || [];
      for (const candidateId of theirBros) {
        if (visited.has(candidateId)) continue;
        visited.add(candidateId);

        // Count mutual connections - signals compatibility & trust.
        const candidateBros = new Set(graph[candidateId] || []);
        let mutualCount = 0;
        for (const myBroId of directSet) {
          if (candidateBros.has(myBroId)) mutualCount++;
        }

        results.push({
          id:          candidateId,
          uid:         candidateId,
          name:        candidateId, // Will be resolved from profile
          avatar:      "🤜",
          degree,
          mutualCount,
          degreeLabel: degree === 2 ? "2nd" : "3rd",
          mutualLabel: mutualCount > 0
            ? `${mutualCount} mutual bro${mutualCount > 1 ? "s" : ""}`
            : "Extended network",
        });

        nextLayer.push(candidateId);
      }
    }
    currentLayer = nextLayer;
  }

  results.sort((a, b) => {
    if (a.degree !== b.degree) return a.degree - b.degree;
    return b.mutualCount - a.mutualCount;
  });

  return results;
}

/**
 * Compute recommendations from the mock graph (for demo/testing).
 */
function _computeRecommendationsFromMock(userId = 0, maxDegree = 3) {
  const graph     = BRO_NETWORK_GRAPH;
  const roster    = ALL_USERS_ROSTER;
  const directSet = new Set(graph[userId] || []);
  const visited   = new Set([userId, ...directSet]);
  const results   = [];
  let currentLayer = [...directSet];

  for (let degree = 2; degree <= maxDegree; degree++) {
    const nextLayer = [];

    for (const broId of currentLayer) {
      const theirBros = graph[broId] || [];
      for (const candidateId of theirBros) {
        if (visited.has(candidateId)) continue;
        visited.add(candidateId);

        const candidateBros = new Set(graph[candidateId] || []);
        let mutualCount = 0;
        for (const myBroId of directSet) {
          if (candidateBros.has(myBroId)) mutualCount++;
        }

        const user = roster[candidateId];
        if (user) {
          results.push({
            id:          candidateId,
            name:        user.name,
            avatar:      user.avatar,
            degree,
            mutualCount,
            degreeLabel: degree === 2 ? "2nd" : "3rd",
            mutualLabel: mutualCount > 0
              ? `${mutualCount} mutual bro${mutualCount > 1 ? "s" : ""}`
              : "Extended network",
          });
        }

        nextLayer.push(candidateId);
      }
    }
    currentLayer = nextLayer;
  }

  results.sort((a, b) => {
    if (a.degree !== b.degree) return a.degree - b.degree;
    return b.mutualCount - a.mutualCount;
  });

  return results;
}

/**
 * Get bro count for a user.
 */
export function getBroCount(userId) {
  return (BRO_NETWORK_GRAPH[userId] || []).length;
}

/**
 * Check connection degree between two users.
 */
export function getConnectionDegree(fromId, toId) {
  if (fromId === toId) return 0;
  const graph   = BRO_NETWORK_GRAPH;
  const visited = new Set([fromId]);
  let layer     = [fromId];

  // BFS to find shortest path. Label recommendations with degree (2nd, 3rd).
  for (let degree = 1; degree <= 3; degree++) {
    const nextLayer = [];
    for (const nodeId of layer) {
      for (const neighborId of (graph[nodeId] || [])) {
        if (neighborId === toId) return degree;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          nextLayer.push(neighborId);
        }
      }
    }
    layer = nextLayer;
  }
  return null;
}
