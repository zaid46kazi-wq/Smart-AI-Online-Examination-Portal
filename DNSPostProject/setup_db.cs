using System;
using System.Data.SqlClient;

class DatabaseSetup
{
    static void Main()
    {
        Console.WriteLine("Setting up SQL Server Database...\n");

        string[] servers = new string[]
        {
            "(localdb)\\MSSQLLocalDB",
            ".\\SQLEXPRESS",
            "."
        };

        SqlConnection conn = null;
        string connectedServer = "";

        // Try to connect to each server
        foreach (string server in servers)
        {
            try
            {
                Console.Write($"Attempting: {server}... ");
                string connStr = $"Server={server};Integrated Security=true;";
                conn = new SqlConnection(connStr);
                conn.Open();
                Console.WriteLine("[CONNECTED]");
                connectedServer = server;
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FAILED] {ex.Message}");
            }
        }

        if (conn == null || conn.State != System.Data.ConnectionState.Open)
        {
            Console.WriteLine("\nERROR: Could not connect to SQL Server.");
            Console.WriteLine("Please install SQL Server from: https://www.microsoft.com/en-us/sql-server/sql-server-downloads");
            return;
        }

        try
        {
            Console.WriteLine("\nCreating database and tables...\n");

            // Create database
            SqlCommand cmd = new SqlCommand(
                "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'OnlineExam') CREATE DATABASE OnlineExam",
                conn);
            cmd.ExecuteNonQuery();
            Console.WriteLine("[OK] Database created or already exists");

            // Switch to the new database
            conn.ChangeDatabase("OnlineExam");

            // Create Users table
            string createTableSql = @"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
                BEGIN
                    CREATE TABLE Users (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        Username NVARCHAR(100) UNIQUE NOT NULL,
                        Password NVARCHAR(100) NOT NULL,
                        Role NVARCHAR(50) NOT NULL DEFAULT 'Student'
                    )
                END";

            cmd = new SqlCommand(createTableSql, conn);
            cmd.ExecuteNonQuery();
            Console.WriteLine("[OK] Users table created or already exists");

            // Insert test data
            string checkSql = "SELECT COUNT(*) FROM Users WHERE Username = 'admin'";
            cmd = new SqlCommand(checkSql, conn);
            int count = (int)cmd.ExecuteScalar();

            if (count == 0)
            {
                string insertSql = @"
                    INSERT INTO Users (Username, Password, Role) 
                    VALUES ('admin', 'admin123', 'Admin'),
                           ('student1', 'pass1', 'Student')";

                cmd = new SqlCommand(insertSql, conn);
                cmd.ExecuteNonQuery();
                Console.WriteLine("[OK] Test credentials inserted");
            }
            else
            {
                Console.WriteLine("[OK] Test credentials already exist");
            }

            Console.WriteLine("\n========================================");
            Console.WriteLine("Setup Complete!");
            Console.WriteLine("========================================");
            Console.WriteLine("\nLogin with:");
            Console.WriteLine("  Admin:   username: admin    password: admin123");
            Console.WriteLine("  Student: username: student1 password: pass1");
            Console.WriteLine("\nDatabase: OnlineExam");
            Console.WriteLine($"Server: {connectedServer}");
            Console.WriteLine("========================================");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
        finally
        {
            if (conn != null)
                conn.Close();
        }
    }
}
