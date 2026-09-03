require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  test "zeigt die Startseite" do
    get root_url
    assert_response :success
    assert_select "h1", "Lieferscheine"
  end
end
