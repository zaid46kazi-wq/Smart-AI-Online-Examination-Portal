-- =============================================
-- SQL Server Database Setup for ASP.NET Web Forms
-- Online Examination System - AGMR College  
-- Developer: Sayed Zaid Kazi
-- =============================================

-- Create Database (run only if it doesn't exist)
-- CREATE DATABASE OnlineExam;
-- GO
-- USE OnlineExam;
-- GO

-- =============================================
-- Table: Users (Login System)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) UNIQUE NOT NULL,
        Password NVARCHAR(100) NOT NULL,
        Role NVARCHAR(50) NOT NULL DEFAULT 'Student'
    );

    -- Default Admin
    INSERT INTO Users (Username, Password, Role) VALUES ('admin', 'admin123', 'Admin');
    -- Default Student
    INSERT INTO Users (Username, Password, Role) VALUES ('student1', 'pass1', 'Student');
END
GO

-- =============================================
-- Table: Questions
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Questions')
BEGIN
    CREATE TABLE Questions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        QuestionText NVARCHAR(MAX) NOT NULL,
        OptionA NVARCHAR(500) NOT NULL,
        OptionB NVARCHAR(500) NOT NULL,
        OptionC NVARCHAR(500) NOT NULL,
        OptionD NVARCHAR(500) NOT NULL,
        CorrectOption NVARCHAR(5) NOT NULL
    );
END
GO

-- =============================================
-- Table: Results
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Results')
BEGIN
    CREATE TABLE Results (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL,
        Score INT NOT NULL DEFAULT 0,
        ExamDate DATETIME DEFAULT GETDATE()
    );
END
GO

-- =============================================
-- Table: Subjects (FEATURE 4 — typed subject input)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Subjects')
BEGIN
    CREATE TABLE Subjects (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        SubjectName NVARCHAR(200) NOT NULL,
        SubjectCode NVARCHAR(50) NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- Verify setup
SELECT 'Users' AS TableName, COUNT(*) AS RowCount FROM Users
UNION ALL
SELECT 'Questions', COUNT(*) FROM Questions
UNION ALL
SELECT 'Results', COUNT(*) FROM Results
UNION ALL
SELECT 'Subjects', COUNT(*) FROM Subjects;
GO
