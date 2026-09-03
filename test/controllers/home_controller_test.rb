require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  test "zeigt die Startseite mit Upload-Feld" do
    get root_url
    assert_response :success
    assert_select "h1", "Lieferscheine"
    assert_select "input[type=file]", 1
  end
end
