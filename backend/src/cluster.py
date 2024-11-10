from typing import Any, Dict, List
import json
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import umap
from sklearn.cluster import HDBSCAN
from sklearn.metrics import (
    calinski_harabasz_score,
    davies_bouldin_score,
    silhouette_score,
)
from sklearn.preprocessing import StandardScaler
import warnings

from vectordb import ChromaStore



class KGClusterer:
    def __init__(self, chroma_store: ChromaStore, random_state: int = 42):
        self.store = chroma_store
        self.random_state = random_state

    def cluster_nodes(
        self,
        collection_name: str,
        n_neighbors: int = 30,        # increased for academic context
        min_cluster_size: int = 3,    # reduced for fine-grained academic concepts
        min_samples: int = 2,         # reduced for better cluster detection
        n_components: int = 2,        # 2D for visualization
        min_dist: float = 0.1,        # increased for better separation
        metric: str = 'cosine'        # better for embeddings
    ) -> Dict[str, Any]:
        try:
            # get collection data
            collection = self.store.collections.get(collection_name)
            if not collection:
                raise ValueError(f"collection '{collection_name}' not found")

            # get embeddings and metadata
            data = collection.get(
                include=['embeddings', 'metadatas', 'documents']
            )

            # process nodes
            nodes = []
            embeddings = np.array(data['embeddings'])

            for doc in data['documents']:
                try:
                    node_data = json.loads(doc)
                    node = {
                        'id': node_data.get('@id', ''),
                        'label': node_data.get('label', ''),
                        'node_type': node_data.get('node_type', ''),
                        'properties': node_data.get('properties', {}),
                        'relationships': node_data.get('related_nodes', [])
                    }
                    nodes.append(node)
                except Exception as e:
                    print(f"skipping invalid node: {e}")
                    continue

            if not nodes:
                raise ValueError("no valid nodes found")

            # normalize embeddings
            scaler = StandardScaler()
            norm_embeddings = scaler.fit_transform(embeddings)

            # perform dimensionality reduction
            print("performing UMAP reduction...")
            reducer = umap.UMAP(
                n_neighbors=n_neighbors,
                n_components=n_components,
                min_dist=min_dist,
                metric=metric,
                random_state=self.random_state
            )
            coords = reducer.fit_transform(norm_embeddings)

            # perform clustering
            print("performing HDBSCAN clustering...")
            clusterer = HDBSCAN(
                min_cluster_size=min_cluster_size,
                min_samples=min_samples,
                metric='euclidean',
                cluster_selection_method='eom'  # better for varying densities
            )
            labels = clusterer.fit_predict(coords)

            # process results
            cluster_nodes = []
            for i, node in enumerate(nodes):
                node.update({
                    'cluster_id': int(labels[i]),
                    'x': float(coords[i][0]),
                    'y': float(coords[i][1])
                })
                cluster_nodes.append(node)

            # calculate metrics
            stats = self._calculate_cluster_stats(
                coords, labels, clusterer
            )

            return {
                'nodes': cluster_nodes,
                'stats': stats
            }

        except Exception as e:
            print(f"clustering failed: {str(e)}")
            return {'nodes': [], 'stats': {}}

    def _calculate_cluster_stats(
        self,
        coords: np.ndarray,
        labels: np.ndarray,
        clusterer: HDBSCAN
    ) -> Dict:
        valid_mask = labels != -1
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)

        stats = {
            'total_nodes': len(labels),
            'clusters': n_clusters,
            'noise_points': sum(1 for l in labels if l == -1)
        }

        if n_clusters > 1 and sum(valid_mask) > 1:
            valid_coords = coords[valid_mask]
            valid_labels = labels[valid_mask]

            try:
                stats.update({
                    'silhouette': float(silhouette_score(
                        valid_coords, valid_labels, metric='euclidean'
                    )),
                    'calinski_harabasz': float(calinski_harabasz_score(
                        valid_coords, valid_labels
                    )),
                    'davies_bouldin': float(davies_bouldin_score(
                        valid_coords, valid_labels
                    ))
                })
            except Exception as e:
                print(f"failed to calculate some metrics: {e}")

        return stats

    def visualize_clusters(
        self,
        cluster_nodes: List[Dict],
        title: str = "Knowledge Graph Clusters"
    ) -> go.Figure:
        # group nodes by cluster
        clusters = {}
        for node in cluster_nodes:
            cluster_id = node['cluster_id']
            if cluster_id not in clusters:
                clusters[cluster_id] = []
            clusters[cluster_id].append(node)

        # create visualization
        fig = go.Figure()
        colors = np.random.rand(len(clusters), 3)

        for cluster_id, nodes in clusters.items():
            hover_text = [
                f"Label: {node['label']}<br>"
                f"Type: {node['node_type']}<br>"
                f"Cluster: {node['cluster_id']}<br>"
                f"Related: {len(node['relationships'])}"
                for node in nodes
            ]

            fig.add_trace(
                go.Scatter(
                    x=[node['x'] for node in nodes],
                    y=[node['y'] for node in nodes],
                    mode='markers+text',
                    name=f'Cluster {cluster_id}',
                    text=[node['label'] for node in nodes],
                    textposition="top center",
                    hovertext=hover_text,
                    hoverinfo='text',
                    marker=dict(
                        size=10,
                        color=f'rgb({int(colors[cluster_id][0]*255)},'
                              f'{int(colors[cluster_id][1]*255)},'
                              f'{int(colors[cluster_id][2]*255)})',
                        line=dict(width=1, color='DarkSlateGrey')
                    )
                )
            )

        fig.update_layout(
            title=title,
            showlegend=True,
            hovermode='closest',
            template='plotly_white',
            width=1000,
            height=800
        )

        return fig
    