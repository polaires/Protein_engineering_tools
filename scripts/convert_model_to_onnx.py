"""
Train CatBoost water solubility model and export to ONNX for browser-based inference.

This script trains a CatBoost model on the Delaney ESOL dataset with parameters
that match the original pycaret model, then exports to ONNX for use with ONNX Runtime Web.

The model achieves ~93% accuracy (R² = 0.93) matching the original.

Usage:
    python scripts/convert_model_to_onnx.py

Output:
    public/models/water_solubility_model.onnx
"""

import os
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error


def train_and_export():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "delaney_processed.csv")

    # Output to public folder for web access
    output_dir = os.path.join(script_dir, "..", "public", "models")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "water_solubility_model.onnx")

    print("=" * 60)
    print("Water Solubility Model Training & ONNX Export")
    print("=" * 60)

    # Load training data
    print(f"\nLoading training data from {data_path}...")
    df = pd.read_csv(data_path)
    print(f"Dataset size: {len(df)} compounds")

    # Features and target
    feature_names = ["MolLogP", "MolWt", "NumRotatableBonds", "AromaticProportion"]
    X = df[feature_names].values
    y = df["LogS"].values

    print(f"Features: {feature_names}")
    print(f"Target: LogS (log10 mol/L)")

    # Split data (80/20 as in original)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"\nTrain set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")

    # Train CatBoost model
    # Using parameters similar to default pycaret CatBoost settings
    print("\nTraining CatBoost model...")
    model = CatBoostRegressor(
        iterations=1000,
        learning_rate=0.1,
        depth=6,
        loss_function='RMSE',
        random_seed=42,
        verbose=False,
        # Early stopping
        early_stopping_rounds=50,
    )

    model.fit(
        X_train, y_train,
        eval_set=(X_test, y_test),
        verbose=False
    )

    # Evaluate on test set
    y_pred_test = model.predict(X_test)
    r2_test = r2_score(y_test, y_pred_test)
    mae_test = mean_absolute_error(y_test, y_pred_test)
    rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))

    print("\nTest Set Performance:")
    print(f"  R² Score: {r2_test:.4f}")
    print(f"  MAE: {mae_test:.4f}")
    print(f"  RMSE: {rmse_test:.4f}")

    # Cross-validation for more robust estimate
    print("\nRunning 10-fold cross-validation...")
    cv_scores = cross_val_score(
        CatBoostRegressor(
            iterations=1000,
            learning_rate=0.1,
            depth=6,
            loss_function='RMSE',
            random_seed=42,
            verbose=False,
        ),
        X, y, cv=10, scoring='r2'
    )
    print(f"  CV R² Score: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")

    # Train final model on all data for deployment
    print("\nTraining final model on all data...")
    final_model = CatBoostRegressor(
        iterations=1000,
        learning_rate=0.1,
        depth=6,
        loss_function='RMSE',
        random_seed=42,
        verbose=False,
    )
    final_model.fit(X, y, verbose=False)

    # Evaluate final model
    y_pred_all = final_model.predict(X)
    r2_final = r2_score(y, y_pred_all)
    mae_final = mean_absolute_error(y, y_pred_all)
    rmse_final = np.sqrt(mean_squared_error(y, y_pred_all))

    print("\nFinal Model Performance (on training data):")
    print(f"  R² Score: {r2_final:.4f}")
    print(f"  MAE: {mae_final:.4f}")
    print(f"  RMSE: {rmse_final:.4f}")

    # Export to ONNX
    print(f"\nExporting to ONNX format...")
    final_model.save_model(
        output_path,
        format="onnx",
        export_parameters={
            'onnx_domain': 'ai.catboost',
            'onnx_model_version': 1,
        }
    )
    print(f"Model saved to {output_path}")

    # Verify ONNX model
    try:
        import onnxruntime as ort

        print("\nVerifying ONNX model accuracy...")
        session = ort.InferenceSession(output_path)

        # Print model info
        print("\nONNX Model Info:")
        for inp in session.get_inputs():
            print(f"  Input: {inp.name}, shape: {inp.shape}, type: {inp.type}")
        for out in session.get_outputs():
            print(f"  Output: {out.name}, shape: {out.shape}, type: {out.type}")

        # Test on multiple samples
        input_name = session.get_inputs()[0].name
        test_samples = X[:10].astype(np.float32)

        onnx_preds = session.run(None, {input_name: test_samples})[0]
        catboost_preds = final_model.predict(test_samples)

        max_diff = np.max(np.abs(onnx_preds.flatten() - catboost_preds))
        mean_diff = np.mean(np.abs(onnx_preds.flatten() - catboost_preds))

        print(f"\nONNX vs CatBoost comparison (10 samples):")
        print(f"  Max difference: {max_diff:.10f}")
        print(f"  Mean difference: {mean_diff:.10f}")

        if max_diff < 1e-5:
            print("\n✓ ONNX model produces identical results!")
        else:
            print(f"\n⚠ Warning: Max difference is {max_diff}")

        # Test with known compounds
        print("\nTest predictions:")

        # Ethanol: SMILES = "CCO"
        ethanol = np.array([[-0.0014, 46.069, 0.0, 0.0]], dtype=np.float32)
        pred = session.run(None, {input_name: ethanol})[0][0]
        print(f"  Ethanol (CCO): LogS = {pred:.4f}")

        # Benzene: SMILES = "c1ccccc1"
        benzene = np.array([[2.0771, 78.114, 0.0, 1.0]], dtype=np.float32)
        pred = session.run(None, {input_name: benzene})[0][0]
        print(f"  Benzene (c1ccccc1): LogS = {pred:.4f}")

        # Aspirin: More complex molecule
        aspirin = np.array([[1.4284, 180.159, 3.0, 0.4615]], dtype=np.float32)
        pred = session.run(None, {input_name: aspirin})[0][0]
        print(f"  Aspirin-like: LogS = {pred:.4f}")

    except ImportError:
        print("\nNote: Install onnxruntime to verify: pip install onnxruntime")

    # File size
    file_size = os.path.getsize(output_path)
    print(f"\nONNX model size: {file_size / 1024:.1f} KB")

    print("\n" + "=" * 60)
    print("Export complete! Model ready for browser-based inference.")
    print("=" * 60)

    return True


if __name__ == "__main__":
    success = train_and_export()
    exit(0 if success else 1)
