from __future__ import annotations

from .train import train
from .train_sequence import train_sequence


def main() -> None:
    print("Training normalized single-frame classifier", flush=True)
    train(epochs=300, batch_size=24, learning_rate=0.001)

    print("Training normalized sequence classifier", flush=True)
    train_sequence(epochs=300, batch_size=16, learning_rate=0.001)


if __name__ == "__main__":
    main()
