using System;
using System.Collections;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Net.Http;
using System.Web;
using System.Web.Security;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using System.Xml.Linq;
using Newtonsoft.Json;

public class LoginRequest
{
    [JsonProperty("username")]
    public string Username { get; set; }

    [JsonProperty("password")]
    public string Password { get; set; }

    [JsonProperty("role")]
    public string Role { get; set; }
}

public class LoginResponse
{
    [JsonProperty("success")]
    public bool Success { get; set; }

    [JsonProperty("role")]
    public string Role { get; set; }

    [JsonProperty("username")]
    public string Username { get; set; }

    [JsonProperty("token")]
    public string Token { get; set; }

    [JsonProperty("error")]
    public string Error { get; set; }
}

public partial class LogIn : System.Web.UI.Page
{
        private string API_BASE_URL = "http://localhost:5000";
    {
        // Try to use custom API URL if configured
        if (!string.IsNullOrEmpty(ConfigurationManager.AppSettings["API_BASE_URL"]))
        {
            API_BASE_URL = ConfigurationManager.AppSettings["API_BASE_URL"];
        }
    }

    protected void btnSignin_Click(object sender, EventArgs e)
    {
        string username = txtUsername.Text.Trim();
        string password = txtPassword.Text.Trim();

        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
        {
            lblError.Visible = true;
            lblError.Text = "Please enter both username and password.";
            return;
        }

        try
        {
            using (HttpClient client = new HttpClient())
            {
                // Determine role based on available options (or just try both)
                string[] roles = { "Admin", "Student" };

                foreach (string role in roles)
                {
                    try
                    {
                        var loginRequest = new LoginRequest
                        {
                            Username = username,
                            Password = password,
                            Role = role
                        };

                        string jsonPayload = JsonConvert.SerializeObject(loginRequest);
                        var content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

                        HttpResponseMessage response = client.PostAsync($"{API_BASE_URL}/api/auth/login", content).Result;

                        if (response.IsSuccessStatusCode)
                        {
                            string responseBody = response.Content.ReadAsStringAsync().Result;
                            LoginResponse loginResponse = JsonConvert.DeserializeObject<LoginResponse>(responseBody);

                            if (loginResponse.Success)
                            {
                                Session["LogInId"] = loginResponse.Username;
                                Session["UserRole"] = loginResponse.Role;
                                Session["Token"] = loginResponse.Token;

                                // Redirect based on role
                                if (loginResponse.Role.ToLower() == "admin")
                                {
                                    Server.Transfer("Menu.aspx");
                                }
                                else if (loginResponse.Role.ToLower() == "student")
                                {
                                    Server.Transfer("CreateOnlineTestStart.aspx");
                                }
                                else
                                {
                                    Server.Transfer("Menu.aspx");
                                }
                                return;
                            }
                        }
                    }
                    catch
                    {
                        // Try next role
                        continue;
                    }
                }

                // If we get here, authentication failed
                lblError.Visible = true;
                lblError.Text = "Invalid username or password. Please try again.";
            }
        }
        catch (Exception ex)
        {
            lblError.Visible = true;
            lblError.Text = "Authentication error. Please check if the server is running.";
            System.Diagnostics.Debug.WriteLine($"Login Error: {ex.Message}");
        }
    }
}
