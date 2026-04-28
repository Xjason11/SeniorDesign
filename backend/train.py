from __future__ import annotations

import random

import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from .samples import get_sample_counts, load_samples
from .sign_model import MODEL_PATH, TOKENS, SignClassifier, get_device, normalize_model_landmark_vector


def train(epochs: int = 250, batch_size: int = 16, learning_rate: float = 0.001) -> None:
    rows = load_samples()
    if len(rows) < 12:
        raise SystemExit("Collect at least 12 total samples before training.")

    labels = {token: index for index, token in enumerate(TOKENS)}
    random.shuffle(rows)

    x = torch.tensor([normalize_model_landmark_vector(row["landmarks"]) for row in rows], dtype=torch.float32)
    y = torch.tensor([labels[row["token"]] for row in rows], dtype=torch.long)

    dataset = TensorDataset(x, y)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    device = get_device()
    model = SignClassifier().to(device)
    loss_function = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        correct = 0

        for batch_x, batch_y in loader:
            batch_x = batch_x.to(device)
            batch_y = batch_y.to(device)

            optimizer.zero_grad()
            logits = model(batch_x)
            loss = loss_function(logits, batch_y)
            loss.backward()
            optimizer.step()

            total_loss += float(loss.item()) * batch_x.size(0)
            correct += int((logits.argmax(dim=1) == batch_y).sum().item())

        if epoch == 1 or epoch % 25 == 0:
            accuracy = correct / len(dataset)
            average_loss = total_loss / len(dataset)
            print(f"epoch={epoch:03d} loss={average_loss:.4f} accuracy={accuracy:.2%}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model_state": model.state_dict(),
            "tokens": TOKENS,
            "sample_counts": get_sample_counts(),
        },
        MODEL_PATH,
    )
    print(f"saved model to {MODEL_PATH}")


if __name__ == "__main__":
    train()
