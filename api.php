<?php

header("Content-Type: application/json");

$csvFile = "IML-System.csv";

function readCSV($file) {
    $rows = [];
    if (($handle = fopen($file, "r")) !== FALSE) {
        while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
            $rows[] = $data;
        }
        fclose($handle);
    }
    return $rows;
}

function writeCSV($file, $rows) {
    $handle = fopen($file, "w");
    foreach ($rows as $row) {
        fputcsv($handle, $row);
    }
    fclose($handle);
}

$action = $_POST["action"] ?? "";

if ($action === "login") {
    $user = $_POST["user"] ?? "";
    $pass = $_POST["pass"] ?? "";

    $rows = readCSV($csvFile);

    foreach ($rows as $i => $row) {
        if ($i === 0) continue; // header
        if ($row[0] === $user && $row[1] === $pass) {
            echo json_encode([
                "success" => true,
                "UserID" => $row[0],
                "Balance" => $row[2],
                "Reversal" => $row[3],
                "TotalCorrect" => $row[4],
                "TotalQuestions" => $row[5]
            ]);
            exit;
        }
    }

    echo json_encode(["success" => false, "error" => "Invalid login"]);
    exit;
}

if ($action === "updateQuiz") {
    $user = $_POST["user"] ?? "";
    $earned = floatval($_POST["earned"] ?? 0);
    $correct = intval($_POST["correct"] ?? 0);
    $total = intval($_POST["total"] ?? 0);

    $rows = readCSV($csvFile);

    for ($i = 1; $i < count($rows); $i++) {
        $row = $rows[$i];
        if ($row[0] === $user) {

            $balance = floatval($row[2]) + $earned;
            $totalCorrect = intval($row[4]) + $correct;
            $totalQuestions = intval($row[5]) + $total;

            $reversal = $totalQuestions > 0 ? ($totalCorrect / $totalQuestions) * 100 : 0;

            $rows[$i][2] = $balance;
            $rows[$i][3] = round($reversal, 2);
            $rows[$i][4] = $totalCorrect;
            $rows[$i][5] = $totalQuestions;

            writeCSV($csvFile, $rows);

            echo json_encode([
                "success" => true,
                "Balance" => $balance,
                "Reversal" => round($reversal, 2),
                "TotalCorrect" => $totalCorrect,
                "TotalQuestions" => $totalQuestions
            ]);
            exit;
        }
    }

    echo json_encode(["success" => false, "error" => "User not found"]);
    exit;
}

if ($action === "redeem") {
    $user = $_POST["user"] ?? "";
    $cost = intval($_POST["cost"] ?? 0);

    $rows = readCSV($csvFile);

    for ($i = 1; $i < count($rows); $i++) {
        $row = $rows[$i];
        if ($row[0] === $user) {

            $balance = intval($row[2]);

            if ($balance < $cost) {
                echo json_encode([
                    "success" => false,
                    "error" => "Not enough balance"
                ]);
                exit;
            }

            $newBalance = $balance - $cost;
            $rows[$i][2] = $newBalance;

            writeCSV($csvFile, $rows);

            echo json_encode([
                "success" => true,
                "newBalance" => $newBalance,
                "rewardCode" => "IML-" . rand(10000,99999)
            ]);
            exit;
        }
    }

    echo json_encode(["success" => false, "error" => "User not found"]);
    exit;
}

echo json_encode(["success" => false, "error" => "Invalid action"]);
